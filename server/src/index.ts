import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import './db'; // opens the database and applies the schema at startup
import authRoutes from './routes/auth';
import bookingRoutes from './routes/bookings';
import packageRoutes from './routes/packages';
import vendorRoutes from './routes/vendor';
import vendorsPublicRoutes from './routes/vendors';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
// 2mb allows a handful of base64 package images while still bounding requests.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Stricter budget for credential endpoints; successful requests don't count.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/vendors', vendorsPublicRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

const server = app.listen(config.port, () => {
  console.log(`Mandap Bazaar API listening on http://localhost:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
