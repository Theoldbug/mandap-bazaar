import { Router } from 'express';
import { z } from 'zod';
import { db, nowISO, transactionImmediate, uuid } from '../db';
import { mapAddon, mapPackage, mapVendorProfile } from '../db/mappers';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import type { Addon, Package, PaginatedResponse } from '../../../shared/types';

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

const addonSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
  price: z.number().int().min(0).max(100_000_000),
  is_default: z.boolean().default(false),
});

// Explicit allowlist — vendor_id/created_at/etc. are never accepted from the body.
const packageSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).default(''),
  category: z.array(z.enum(EVENT_CATEGORY_VALUES)).min(1).max(7),
  starting_price: z.number().int().min(0).max(100_000_000),
  images: z.array(z.string().max(500_000)).max(10).default([]),
  inclusions: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  is_active: z.boolean().default(true),
  addons: z.array(addonSchema).max(20).default([]),
});

function loadAddons(packageId: string): Addon[] {
  const rows = db
    .prepare('SELECT * FROM addons WHERE package_id = ?')
    .all(packageId) as Record<string, unknown>[];
  return rows.map(mapAddon);
}

function packageWithExtras(row: Record<string, unknown>) {
  const pkg = mapPackage(row);
  const vendorRow = db
    .prepare('SELECT * FROM vendor_profiles WHERE id = ?')
    .get(pkg.vendor_id) as Record<string, unknown> | undefined;
  const vendor = vendorRow ? mapVendorProfile(vendorRow) : undefined;
  return {
    ...pkg,
    addons: loadAddons(pkg.id),
    vendor: vendor
      ? {
          id: vendor.id,
          business_name: vendor.business_name,
          city: vendor.city,
          is_verified: vendor.is_verified,
          rating: vendor.rating,
          total_reviews: vendor.total_reviews,
          logo_url: vendor.logo_url,
        }
      : undefined,
  };
}

function saveAddons(packageId: string, addons: z.infer<typeof addonSchema>[]) {
  const keptIds = addons.filter((a) => a.id).map((a) => a.id!);
  if (keptIds.length > 0) {
    const placeholders = keptIds.map(() => '?').join(',');
    db.prepare(
      `DELETE FROM addons WHERE package_id = ? AND id NOT IN (${placeholders})`
    ).run(packageId, ...keptIds);
  } else {
    db.prepare('DELETE FROM addons WHERE package_id = ?').run(packageId);
  }
  const upsert = db.prepare(
    `INSERT INTO addons (id, package_id, name, description, price, is_default)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, description = excluded.description,
       price = excluded.price, is_default = excluded.is_default`
  );
  for (const addon of addons) {
    upsert.run(
      addon.id ?? uuid(),
      packageId,
      addon.name,
      addon.description,
      addon.price,
      addon.is_default ? 1 : 0
    );
  }
}

// Public storefront listing — active packages from verified vendors.
router.get('/public', (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const { category, city, search } = req.query;

    const clauses = ['p.is_active = 1', 'v.is_verified = 1'];
    const params: (string | number)[] = [];
    if (typeof category === 'string' && category) {
      clauses.push(`p.category LIKE ?`);
      params.push(`%"${category}"%`);
    }
    if (typeof city === 'string' && city) {
      clauses.push(`v.city LIKE ?`);
      params.push(`%${city}%`);
    }
    if (typeof search === 'string' && search) {
      clauses.push(`(p.name LIKE ? OR v.business_name LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const fromJoin = `FROM packages p JOIN vendor_profiles v ON v.id = p.vendor_id ${where}`;

    const { count } = db.prepare(`SELECT COUNT(*) AS count ${fromJoin}`).get(...params) as {
      count: number;
    };
    const rows = db
      .prepare(`SELECT p.* ${fromJoin} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];

    const response: PaginatedResponse<ReturnType<typeof packageWithExtras>> = {
      data: rows.map(packageWithExtras),
      count,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(count / pageSize),
    };
    res.json(response);
  } catch (err) {
    console.error('Public packages error:', err);
    res.status(500).json({ error: 'Failed to load packages' });
  }
});

// Vendor's own package list.
router.get('/', authenticate, requireRole('vendor'), (req: AuthenticatedRequest, res) => {
  try {
    const rows = db
      .prepare('SELECT * FROM packages WHERE vendor_id = ? ORDER BY created_at DESC')
      .all(req.vendorProfileId!) as Record<string, unknown>[];
    res.json({ packages: rows.map((r) => ({ ...mapPackage(r), addons: loadAddons(r.id as string) })) });
  } catch (err) {
    console.error('List packages error:', err);
    res.status(500).json({ error: 'Failed to load packages' });
  }
});

router.post(
  '/',
  authenticate,
  requireRole('vendor'),
  validate(packageSchema),
  (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as z.infer<typeof packageSchema>;
      const id = transactionImmediate(() => {
        const pkgId = uuid();
        const now = nowISO();
        db.prepare(
          `INSERT INTO packages (id, vendor_id, name, description, category, starting_price,
             images, inclusions, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          pkgId,
          req.vendorProfileId!,
          input.name,
          input.description,
          JSON.stringify(input.category),
          input.starting_price,
          JSON.stringify(input.images),
          JSON.stringify(input.inclusions),
          input.is_active ? 1 : 0,
          now,
          now
        );
        saveAddons(pkgId, input.addons);
        return pkgId;
      });
      const row = db.prepare('SELECT * FROM packages WHERE id = ?').get(id) as Record<string, unknown>;
      res.status(201).json({ package: { ...mapPackage(row), addons: loadAddons(id) } });
    } catch (err) {
      console.error('Create package error:', err);
      res.status(500).json({ error: 'Failed to create package' });
    }
  }
);

router.put(
  '/:id',
  authenticate,
  requireRole('vendor'),
  validate(packageSchema.partial()),
  (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as Partial<z.infer<typeof packageSchema>>;
      const packageId = String(req.params.id);
      const existing = db
        .prepare('SELECT * FROM packages WHERE id = ? AND vendor_id = ?')
        .get(packageId, req.vendorProfileId!) as Record<string, unknown> | undefined;
      if (!existing) return res.status(404).json({ error: 'Package not found' });

      transactionImmediate(() => {
        const current = mapPackage(existing);
        db.prepare(
          `UPDATE packages SET name = ?, description = ?, category = ?, starting_price = ?,
             images = ?, inclusions = ?, is_active = ?, updated_at = ?
           WHERE id = ?`
        ).run(
          input.name ?? current.name,
          input.description ?? current.description,
          JSON.stringify(input.category ?? current.category),
          input.starting_price ?? current.starting_price,
          JSON.stringify(input.images ?? current.images),
          JSON.stringify(input.inclusions ?? current.inclusions),
          (input.is_active ?? current.is_active) ? 1 : 0,
          nowISO(),
          current.id
        );
        if (input.addons) saveAddons(current.id, input.addons);
      });

      const row = db.prepare('SELECT * FROM packages WHERE id = ?').get(packageId) as Record<string, unknown>;
      res.json({ package: { ...mapPackage(row), addons: loadAddons(packageId) } });
    } catch (err) {
      console.error('Update package error:', err);
      res.status(500).json({ error: 'Failed to update package' });
    }
  }
);

// Soft delete — bookings keep referencing the package row.
router.delete('/:id', authenticate, requireRole('vendor'), (req: AuthenticatedRequest, res) => {
  try {
    const result = db
      .prepare('UPDATE packages SET is_active = 0, updated_at = ? WHERE id = ? AND vendor_id = ?')
      .run(nowISO(), String(req.params.id), req.vendorProfileId!);
    if (Number(result.changes) === 0) return res.status(404).json({ error: 'Package not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete package error:', err);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// Public package detail (used by the booking/customize flow).
router.get('/:id', (req, res) => {
  try {
    const row = db
      .prepare(
        `SELECT p.* FROM packages p
         JOIN vendor_profiles v ON v.id = p.vendor_id
         WHERE p.id = ? AND p.is_active = 1 AND v.is_verified = 1`
      )
      .get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: 'Package not found' });
    res.json({ package: packageWithExtras(row) });
  } catch (err) {
    console.error('Get package error:', err);
    res.status(500).json({ error: 'Failed to load package' });
  }
});

export default router;
