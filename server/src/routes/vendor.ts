import { Router } from 'express';
import { z } from 'zod';
import { db, nowISO } from '../db';
import { mapVendorProfile } from '../db/mappers';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import type { DashboardStats } from '../../../shared/types';

// The authenticated vendor's own profile and dashboard.
const router = Router();

router.use(authenticate, requireRole('vendor'));

const EVENT_CATEGORY_VALUES = [
  'marriage_decor',
  'haldi_decor',
  'mehendi_sangeet',
  'ring_ceremony',
  'birthday_decor',
  'food_stalls',
  'dj_lighting',
] as const;

// Explicit allowlist: is_verified, rating and total_reviews are platform-owned
// and structurally impossible to set through this endpoint.
const profileSchema = z
  .object({
    business_name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(2000),
    category: z.array(z.enum(EVENT_CATEGORY_VALUES)).max(7),
    logo_url: z.string().max(500_000).nullable(),
    cover_image_url: z.string().max(500_000).nullable(),
    address: z.string().trim().max(300),
    city: z.string().trim().max(100),
    state: z.string().trim().max(100),
    phone: z.string().trim().max(20),
    email: z.email().max(254),
    response_time_minutes: z.number().int().min(1).max(10_080),
  })
  .partial();

router.get('/', (req: AuthenticatedRequest, res) => {
  const row = db
    .prepare('SELECT * FROM vendor_profiles WHERE id = ?')
    .get(req.vendorProfileId!) as Record<string, unknown>;
  res.json({ profile: mapVendorProfile(row) });
});

router.put('/', validate(profileSchema), (req: AuthenticatedRequest, res) => {
  try {
    const input = req.body as z.infer<typeof profileSchema>;
    const row = db
      .prepare('SELECT * FROM vendor_profiles WHERE id = ?')
      .get(req.vendorProfileId!) as Record<string, unknown>;
    const current = mapVendorProfile(row);

    db.prepare(
      `UPDATE vendor_profiles SET business_name = ?, description = ?, category = ?,
         logo_url = ?, cover_image_url = ?, address = ?, city = ?, state = ?,
         phone = ?, email = ?, response_time_minutes = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.business_name ?? current.business_name,
      input.description ?? current.description,
      JSON.stringify(input.category ?? current.category),
      input.logo_url !== undefined ? input.logo_url : current.logo_url ?? null,
      input.cover_image_url !== undefined ? input.cover_image_url : current.cover_image_url ?? null,
      input.address ?? current.address,
      input.city ?? current.city,
      input.state ?? current.state,
      input.phone ?? current.phone,
      input.email ?? current.email,
      input.response_time_minutes ?? current.response_time_minutes,
      nowISO(),
      current.id
    );

    const updated = db
      .prepare('SELECT * FROM vendor_profiles WHERE id = ?')
      .get(current.id) as Record<string, unknown>;
    res.json({ profile: mapVendorProfile(updated) });
  } catch (err) {
    console.error('Update vendor profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/dashboard', (req: AuthenticatedRequest, res) => {
  try {
    const vendorId = req.vendorProfileId!;

    const revenue = db
      .prepare(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM bookings
         WHERE vendor_id = ? AND status IN ('accepted','completed')`
      )
      .get(vendorId) as { total: number };
    const active = db
      .prepare(`SELECT COUNT(*) AS count FROM bookings WHERE vendor_id = ? AND status = 'accepted'`)
      .get(vendorId) as { count: number };
    const pending = db
      .prepare(`SELECT COUNT(*) AS count FROM bookings WHERE vendor_id = ? AND status = 'pending'`)
      .get(vendorId) as { count: number };
    const profile = db
      .prepare('SELECT rating FROM vendor_profiles WHERE id = ?')
      .get(vendorId) as { rating: number };

    // Real 6-month revenue trend from accepted/completed bookings.
    const trendRows = db
      .prepare(
        `SELECT strftime('%Y-%m', event_date) AS month, SUM(total_amount) AS revenue
         FROM bookings
         WHERE vendor_id = ? AND status IN ('accepted','completed')
           AND event_date >= date('now', '-5 months', 'start of month')
         GROUP BY month ORDER BY month`
      )
      .all(vendorId) as { month: string; revenue: number }[];

    const months: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'short' });
      const found = trendRows.find((r) => r.month === key);
      months.push({ month: label, revenue: found?.revenue ?? 0 });
    }

    const stats: DashboardStats = {
      total_revenue: revenue.total,
      active_bookings: active.count,
      pending_requests: pending.count,
      average_rating: profile.rating,
      revenue_trend: months,
    };
    res.json({ stats });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

export default router;
