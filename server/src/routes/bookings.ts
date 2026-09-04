import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { mapBookingAddon } from '../db/mappers';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  BookingError,
  createBooking,
  loadBookingWithAddons,
  transitionBooking,
} from '../services/bookingService';
import type { BookingWithDetails, PaginatedResponse } from '../../../shared/types';

const router = Router();

const EVENT_CATEGORY_VALUES = [
  'marriage_decor',
  'haldi_decor',
  'mehendi_sangeet',
  'ring_ceremony',
  'birthday_decor',
  'food_stalls',
  'dj_lighting',
] as const;

const createBookingSchema = z.object({
  package_id: z.uuid(),
  event_type: z.enum(EVENT_CATEGORY_VALUES),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date')
    .refine((d) => d >= new Date().toISOString().slice(0, 10), 'Event date cannot be in the past'),
  event_time: z.enum(['morning', 'afternoon', 'evening', 'full_day']),
  venue_address: z.string().trim().min(5).max(300),
  venue_city: z.string().trim().min(2).max(100),
  selected_addon_ids: z.array(z.uuid()).max(20).default([]),
  special_instructions: z.string().trim().max(1000).optional(),
});

const statusSchema = z.object({
  status: z.enum(['accepted', 'declined', 'completed']),
});

function handleBookingError(err: unknown, res: import('express').Response) {
  if (err instanceof BookingError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.conflictingBookingId ? { conflicting_booking_id: err.conflictingBookingId } : {}),
    });
  }
  // The uq_accepted_slot unique index is the DB-level backstop; a violation
  // means a conflicting accepted booking snuck in.
  if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
    return res
      .status(409)
      .json({ error: 'A conflicting accepted booking already exists', code: 'SLOT_CONFLICT' });
  }
  console.error('Booking error:', err);
  res.status(500).json({ error: 'Something went wrong' });
}

function attachDetails(bookingRows: Record<string, unknown>[]): BookingWithDetails[] {
  return bookingRows.map((row) => {
    const addonRows = db
      .prepare('SELECT addon_id, name, price FROM booking_addons WHERE booking_id = ?')
      .all(row.id as string) as Record<string, unknown>[];
    const vendor = db
      .prepare('SELECT id, business_name, city, phone, logo_url FROM vendor_profiles WHERE id = ?')
      .get(row.vendor_id as string) as BookingWithDetails['vendor'];
    const pkgRow = db
      .prepare('SELECT id, name, starting_price, images FROM packages WHERE id = ?')
      .get(row.package_id as string) as Record<string, unknown> | undefined;
    const customer = db
      .prepare('SELECT id, full_name, email FROM users WHERE id = ?')
      .get(row.customer_id as string) as BookingWithDetails['customer'];

    return {
      ...(row as unknown as BookingWithDetails),
      addons: addonRows.map(mapBookingAddon),
      vendor,
      package: pkgRow
        ? {
            id: pkgRow.id as string,
            name: pkgRow.name as string,
            starting_price: pkgRow.starting_price as number,
            images: JSON.parse((pkgRow.images as string) || '[]'),
          }
        : undefined,
      customer,
    };
  });
}

router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));

    const scopeColumn = req.user!.role === 'customer' ? 'customer_id' : 'vendor_id';
    const scopeValue =
      req.user!.role === 'customer' ? req.user!.id : req.vendorProfileId!;

    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where = statusFilter
      ? `WHERE ${scopeColumn} = ? AND status = ?`
      : `WHERE ${scopeColumn} = ?`;
    const params = statusFilter ? [scopeValue, statusFilter] : [scopeValue];

    const { count } = db
      .prepare(`SELECT COUNT(*) AS count FROM bookings ${where}`)
      .get(...params) as { count: number };

    const rows = db
      .prepare(
        `SELECT * FROM bookings ${where} ORDER BY event_date DESC, created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];

    const response: PaginatedResponse<BookingWithDetails> = {
      data: attachDetails(rows),
      count,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(count / pageSize),
    };
    res.json(response);
  } catch (err) {
    handleBookingError(err, res);
  }
});

router.post(
  '/',
  authenticate,
  requireRole('customer'),
  validate(createBookingSchema),
  (req: AuthenticatedRequest, res) => {
    try {
      const booking = createBooking(req.user!.id, req.body);
      res.status(201).json({ booking });
    } catch (err) {
      handleBookingError(err, res);
    }
  }
);

router.put(
  '/:id/status',
  authenticate,
  requireRole('vendor'),
  validate(statusSchema),
  (req: AuthenticatedRequest, res) => {
    try {
      const result = transitionBooking(
        { role: 'vendor', userId: req.user!.id, vendorProfileId: req.vendorProfileId },
        String(req.params.id),
        req.body.status
      );
      res.json(result);
    } catch (err) {
      handleBookingError(err, res);
    }
  }
);

router.post(
  '/:id/cancel',
  authenticate,
  requireRole('customer'),
  (req: AuthenticatedRequest, res) => {
    try {
      const result = transitionBooking(
        { role: 'customer', userId: req.user!.id },
        String(req.params.id),
        'cancelled'
      );
      res.json(result);
    } catch (err) {
      handleBookingError(err, res);
    }
  }
);

router.get('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const booking = loadBookingWithAddons(String(req.params.id));
    const owned =
      booking &&
      (req.user!.role === 'customer'
        ? booking.customer_id === req.user!.id
        : booking.vendor_id === req.vendorProfileId);
    if (!booking || !owned) return res.status(404).json({ error: 'Booking not found' });

    const [details] = attachDetails([
      db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) as Record<string, unknown>,
    ]);
    res.json({ booking: details });
  } catch (err) {
    handleBookingError(err, res);
  }
});

export default router;
