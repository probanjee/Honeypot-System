import express, { Application } from 'express';
import { applySecurityMiddleware } from '../middleware/security';
import { applyRequestLogger } from '../middleware/requestLogger';
import { errorHandler } from '../middleware/errorHandler';
import { notFound } from '../middleware/notFound';
import routes from '../routes';
import honeypotRoutes from '../honeypot/routes';
import { honeypotMiddleware } from '../honeypot/engine';
import { config } from '../config/app';

// ---------------------------------------------------------------------------
// Application factory function.
//
// Returns a configured Express Application WITHOUT binding to a port.
// This separation allows clean testing (supertest creates its own server)
// and enables the server to be started independently in server.ts.
// ---------------------------------------------------------------------------

export function createApp(): Application {
  const app = express();

  // ── Trust proxy (needed when behind nginx / load balancer / Docker) ────────
  if (config.server.isProduction) {
    app.set('trust proxy', 1);
  }

  // ── Core body parsing ─────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // ── Security & utility middleware ─────────────────────────────────────────
  applySecurityMiddleware(app);

  // ── Request logging ───────────────────────────────────────────────────────
  applyRequestLogger(app);

  // ── Honeypot routes (open SSE and stats for dashboard) ────────────────────
  app.use('/honeypot', honeypotRoutes);

  // ── Honeypot detection engine (monitors all incoming requests) ────────────
  app.use(honeypotMiddleware);

  // ── Domain Routes ─────────────────────────────────────────────────────────
  // Health endpoints → /health/*
  // API endpoints   → /api/v1/*
  app.use('/', routes);

  // ── 404 handler (must be after all routes) ────────────────────────────────
  app.use(notFound);

  // ── Centralized error handler (must be last) ──────────────────────────────
  app.use(errorHandler);

  return app;
}
