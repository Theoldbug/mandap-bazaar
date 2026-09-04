import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db';
import type { UserRole } from '../../../shared/types';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: UserRole };
  // Resolved once here for vendors so no route can accidentally run an
  // unfiltered query when the profile row is missing.
  vendorProfileId?: string;
}

const selectUser = db.prepare('SELECT id, email, role FROM users WHERE id = ?');
const selectVendorProfileId = db.prepare('SELECT id FROM vendor_profiles WHERE user_id = ?');

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice('Bearer '.length);

  let decoded: { id: string };
  try {
    decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as { id: string };
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = selectUser.get(decoded.id) as
    | { id: string; email: string; role: UserRole }
    | undefined;
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  if (user.role === 'vendor') {
    const profile = selectVendorProfileId.get(user.id) as { id: string } | undefined;
    if (!profile) {
      // A vendor account with no profile row cannot own anything; refuse
      // rather than let downstream queries run unscoped.
      return res.status(403).json({ error: 'Vendor profile not found' });
    }
    req.vendorProfileId = profile.id;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
