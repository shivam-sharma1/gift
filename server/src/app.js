import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { errorHandler } from './errors.js';
import authRoutes from './routes/auth.js';
import organizerRoutes from './routes/organizer.js';
import guestRoutes, { publicRouter } from './routes/guest.js';
import uploadRoutes from './routes/uploads.js';

export function createApp() {
  const app = express();

  // Behind Render's proxy: needed for real client IPs (rate limiting) and secure cookies.
  if (config.production) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'img-src': ["'self'", 'data:', 'https:'] },
      },
    }),
  );
  // The web app lives on a different origin (GitHub Pages) and needs the guest cookie sent with its requests.
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const limiter = (max) => rateLimit({ windowMs: 15 * 60 * 1000, limit: max, standardHeaders: true, legacyHeaders: false });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/auth', limiter(30), authRoutes);
  app.use('/api/public', limiter(200), publicRouter);
  app.use('/api/organizer', organizerRoutes);
  app.use('/api/guest', guestRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  app.use(errorHandler);
  return app;
}
