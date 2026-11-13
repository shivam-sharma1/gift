import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { clientDist, uploadsDir } from './paths.js';
import { errorHandler } from './errors.js';
import authRoutes from './routes/auth.js';
import organizerRoutes from './routes/organizer.js';
import guestRoutes, { publicRouter } from './routes/guest.js';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'img-src': ["'self'", 'data:', 'https:'] },
      },
    }),
  );
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const limiter = (max) => rateLimit({ windowMs: 15 * 60 * 1000, limit: max, standardHeaders: true, legacyHeaders: false });

  app.use('/uploads', express.static(uploadsDir, { index: false, dotfiles: 'deny' }));
  app.use('/api/auth', limiter(30), authRoutes);
  app.use('/api/public', limiter(200), publicRouter);
  app.use('/api/organizer', organizerRoutes);
  app.use('/api/guest', guestRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  // In production the built React app is served from here as well.
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
