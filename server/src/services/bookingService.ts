import { db, nowISO, transactionImmediate, uuid } from '../db';
import { mapBooking, mapBookingAddon, mapPackage } from '../db/mappers';
import {
  BOOKING_TRANSITIONS,
  type Booking,
  type BookingStatus,
  type CreateBookingRequest,
  type TimeSlot,
} from '../../../shared/types';

/**
 * Thrown for every domain-rule violation; routes map it to an HTTP response.
 */
export class BookingError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public conflictingBookingId?: string
  ) {
    super(message);
  }
}

/**
 * Two slots on the same date conflict iff they are equal, or either one is
 * full_day. Written as a SQL predicate so it runs inside the transaction.
 */
const CONFLICT_SQL = `
  SELECT id FROM bookings
  WHERE vendor_id = ? AND event_date = ? AND status = 'accepted'
    AND (event_time = ? OR event_time = 'full_day' OR ? = 'full_day')
    AND id != COALESCE(?, '')
  LIMIT 1`;

function findConflict(
  vendorId: string,
  eventDate: string,
  slot: TimeSlot,
  excludeBookingId?: string
): string | undefined {
  const row = db
    .prepare(CONFLICT_SQL)
    .get(vendorId, eventDate, slot, slot, excludeBookingId ?? null) as
    | { id: string }
    | undefined;
  return row?.id;
}

export function loadBookingWithAddons(bookingId: string): Booking | undefined {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return undefined;
  const addonRows = db
    .prepare('SELECT addon_id, name, price FROM booking_addons WHERE booking_id = ?')
    .all(bookingId) as Record<string, unknown>[];
  return mapBooking(row, addonRows.map(mapBookingAddon));
}

/**
 * Creates a booking atomically inside a BEGIN IMMEDIATE transaction:
 * package validation, addon-ownership validation with price snapshotting,
 * server-side total computation, conflict check, and the inserts all happen
 * under one write lock — no interleaved writer can invalidate the checks.
 */
export function createBooking(customerId: string, input: CreateBookingRequest): Booking {
  return transactionImmediate(() => {
    const pkgRow = db.prepare('SELECT * FROM packages WHERE id = ?').get(input.package_id) as
      | Record<string, unknown>
      | undefined;
    if (!pkgRow) throw new BookingError(404, 'Package not found');
    const pkg = mapPackage(pkgRow);
    if (!pkg.is_active) throw new BookingError(409, 'This package is no longer available');

    // Addon prices come only from this query, scoped to the package —
    // addon IDs from other packages are rejected outright.
    const requestedIds = [...new Set(input.selected_addon_ids)];
    let addonRows: { id: string; name: string; price: number }[] = [];
    if (requestedIds.length > 0) {
      const placeholders = requestedIds.map(() => '?').join(',');
      addonRows = db
        .prepare(
          `SELECT id, name, price FROM addons WHERE package_id = ? AND id IN (${placeholders})`
        )
        .all(pkg.id, ...requestedIds) as { id: string; name: string; price: number }[];
      if (addonRows.length !== requestedIds.length) {
        throw new BookingError(400, 'One or more add-ons do not belong to this package', 'INVALID_ADDONS');
      }
    }

    const totalAmount =
      pkg.starting_price + addonRows.reduce((sum, a) => sum + a.price, 0);

    const conflictId = findConflict(pkg.vendor_id, input.event_date, input.event_time);
    if (conflictId) {
      throw new BookingError(
        409,
        'This vendor is already booked for that date and time slot',
        'SLOT_CONFLICT',
        conflictId
      );
    }

    const id = uuid();
    const now = nowISO();
    db.prepare(
      `INSERT INTO bookings (
         id, customer_id, vendor_id, package_id, event_type, event_date, event_time,
         venue_address, venue_city, special_instructions, total_amount, amount_paid,
         status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?)`
    ).run(
      id,
      customerId,
      pkg.vendor_id,
      pkg.id,
      input.event_type,
      input.event_date,
      input.event_time,
      input.venue_address,
      input.venue_city,
      input.special_instructions ?? '',
      totalAmount,
      now,
      now
    );

    const insertAddon = db.prepare(
      'INSERT INTO booking_addons (booking_id, addon_id, name, price) VALUES (?, ?, ?, ?)'
    );
    for (const addon of addonRows) {
      insertAddon.run(id, addon.id, addon.name, addon.price);
    }

    return loadBookingWithAddons(id)!;
  });
}

export interface TransitionActor {
  role: 'customer' | 'vendor';
  userId: string;
  vendorProfileId?: string;
}

const VENDOR_TARGETS: BookingStatus[] = ['accepted', 'declined', 'completed'];
const CUSTOMER_TARGETS: BookingStatus[] = ['cancelled'];

/**
 * Single entry point for every status change. Enforces ownership, the
 * BOOKING_TRANSITIONS state machine, and per-role rules. Accepting a booking
 * runs a conflict check and auto-declines competing pending requests for the
 * same vendor/date/slot window — all inside one immediate transaction.
 */
export function transitionBooking(
  actor: TransitionActor,
  bookingId: string,
  target: BookingStatus
): { booking: Booking; auto_declined_count?: number } {
  const allowedTargets = actor.role === 'vendor' ? VENDOR_TARGETS : CUSTOMER_TARGETS;
  if (!allowedTargets.includes(target)) {
    throw new BookingError(403, `You cannot set a booking to '${target}'`);
  }

  return transactionImmediate(() => {
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as
      | Record<string, unknown>
      | undefined;
    // Not-owned reads 404 (not 403) so booking IDs can't be probed.
    const owned =
      row &&
      (actor.role === 'customer'
        ? row.customer_id === actor.userId
        : row.vendor_id === actor.vendorProfileId);
    if (!row || !owned) throw new BookingError(404, 'Booking not found');

    const currentStatus = row.status as BookingStatus;
    if (!BOOKING_TRANSITIONS[currentStatus].includes(target)) {
      throw new BookingError(
        409,
        `Cannot change a ${currentStatus} booking to ${target}`,
        'INVALID_TRANSITION'
      );
    }

    let autoDeclinedCount: number | undefined;
    if (target === 'accepted') {
      const slot = row.event_time as TimeSlot;
      const conflictId = findConflict(
        row.vendor_id as string,
        row.event_date as string,
        slot,
        bookingId
      );
      if (conflictId) {
        throw new BookingError(
          409,
          'You already have an accepted booking for that date and time slot',
          'SLOT_CONFLICT',
          conflictId
        );
      }

      db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(
        'accepted',
        nowISO(),
        bookingId
      );

      const declineResult = db
        .prepare(
          `UPDATE bookings SET status = 'declined', updated_at = ?
           WHERE vendor_id = ? AND event_date = ? AND status = 'pending' AND id != ?
             AND (event_time = ? OR event_time = 'full_day' OR ? = 'full_day')`
        )
        .run(
          nowISO(),
          row.vendor_id as string,
          row.event_date as string,
          bookingId,
          row.event_time as string,
          row.event_time as string
        );
      autoDeclinedCount = Number(declineResult.changes);
    } else {
      db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(
        target,
        nowISO(),
        bookingId
      );
    }

    return { booking: loadBookingWithAddons(bookingId)!, auto_declined_count: autoDeclinedCount };
  });
}
