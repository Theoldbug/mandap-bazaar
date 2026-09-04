import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { db, nowISO, transactionImmediate, uuid } from '../db';
import { mapUser, mapVendorProfile } from '../db/mappers';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import type { AuthResponse, VendorProfile } from '../../../shared/types';

const router = Router();

// Compared against when the email doesn't exist, so login takes the same
// time either way (no user-enumeration timing oracle).
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-dummy-password', 12);

const signupSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(['customer', 'vendor']),
  businessName: z.string().trim().min(2).max(100).optional(),
});

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

function signToken(userId: string): string {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    algorithm: 'HS256',
    expiresIn: config.jwt.expiresIn,
  });
}

function loadVendorProfile(userId: string): VendorProfile | null {
  const row = db.prepare('SELECT * FROM vendor_profiles WHERE user_id = ?').get(userId);
  return row ? mapVendorProfile(row as Record<string, unknown>) : null;
}

router.post('/signup', validate(signupSchema), async (req, res) => {
  const { email, password, fullName, role, businessName } = req.body as z.infer<
    typeof signupSchema
  >;
  const normalizedEmail = email.toLowerCase();

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const userId = transactionImmediate(() => {
      const existing = db
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(normalizedEmail);
      if (existing) throw new DuplicateEmailError();

      const now = nowISO();
      const id = uuid();
      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, normalizedEmail, passwordHash, fullName, role, now, now);

      if (role === 'vendor') {
        db.prepare(
          `INSERT INTO vendor_profiles (id, user_id, business_name, email, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(uuid(), id, businessName || fullName, normalizedEmail, now, now);
      }
      return id;
    });

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const response: AuthResponse = {
      user: mapUser(userRow as Record<string, unknown>),
      vendorProfile: loadVendorProfile(userId),
      token: signToken(userId),
    };
    res.status(201).json(response);
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  try {
    const userRow = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.toLowerCase()) as Record<string, unknown> | undefined;

    const hash = userRow ? (userRow.password_hash as string) : DUMMY_HASH;
    const valid = await bcrypt.compare(password, hash);
    if (!userRow || !valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const response: AuthResponse = {
      user: mapUser(userRow),
      vendorProfile: loadVendorProfile(userRow.id as string),
      token: signToken(userRow.id as string),
    };
    res.json(response);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
  if (!userRow) return res.status(404).json({ error: 'User not found' });
  res.json({
    user: mapUser(userRow as Record<string, unknown>),
    vendorProfile: loadVendorProfile(req.user!.id),
  });
});

class DuplicateEmailError extends Error {}

export default router;
