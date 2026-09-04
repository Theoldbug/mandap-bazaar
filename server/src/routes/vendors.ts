import { Router } from 'express';
import { db } from '../db';
import { mapAddon, mapPackage, mapReview, mapVendorProfile } from '../db/mappers';
import type { PaginatedResponse, VendorProfile } from '../../../shared/types';

// Public vendor browsing — no auth required. Only verified vendors are listed.
const router = Router();

router.get('/', (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const { category, city, search } = req.query;

    const clauses = ['is_verified = 1'];
    const params: (string | number)[] = [];
    if (typeof category === 'string' && category) {
      clauses.push('category LIKE ?');
      params.push(`%"${category}"%`);
    }
    if (typeof city === 'string' && city) {
      clauses.push('city LIKE ?');
      params.push(`%${city}%`);
    }
    if (typeof search === 'string' && search) {
      clauses.push('(business_name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = `WHERE ${clauses.join(' AND ')}`;

    const { count } = db
      .prepare(`SELECT COUNT(*) AS count FROM vendor_profiles ${where}`)
      .get(...params) as { count: number };
    const rows = db
      .prepare(
        `SELECT * FROM vendor_profiles ${where} ORDER BY rating DESC, total_reviews DESC LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];

    const response: PaginatedResponse<VendorProfile> = {
      data: rows.map(mapVendorProfile),
      count,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(count / pageSize),
    };
    res.json(response);
  } catch (err) {
    console.error('List vendors error:', err);
    res.status(500).json({ error: 'Failed to load vendors' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db
      .prepare('SELECT * FROM vendor_profiles WHERE id = ? AND is_verified = 1')
      .get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: 'Vendor not found' });

    const vendor = mapVendorProfile(row);
    const packageRows = db
      .prepare('SELECT * FROM packages WHERE vendor_id = ? AND is_active = 1 ORDER BY starting_price ASC')
      .all(vendor.id) as Record<string, unknown>[];
    const packages = packageRows.map((p) => {
      const addonRows = db
        .prepare('SELECT * FROM addons WHERE package_id = ?')
        .all(p.id as string) as Record<string, unknown>[];
      return { ...mapPackage(p), addons: addonRows.map(mapAddon) };
    });

    res.json({ vendor: { ...vendor, packages } });
  } catch (err) {
    console.error('Get vendor error:', err);
    res.status(500).json({ error: 'Failed to load vendor' });
  }
});

router.get('/:id/reviews', (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT r.*, u.full_name AS customer_name
         FROM reviews r JOIN users u ON u.id = r.customer_id
         WHERE r.vendor_id = ? ORDER BY r.created_at DESC LIMIT 50`
      )
      .all(req.params.id) as Record<string, unknown>[];
    res.json({ reviews: rows.map(mapReview) });
  } catch (err) {
    console.error('Vendor reviews error:', err);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

export default router;
