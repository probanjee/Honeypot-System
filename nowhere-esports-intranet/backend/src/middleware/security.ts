import { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { config } from '../config/app';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// security — mounts all security and utility middleware onto the Express app.
//
// Order matters:
//   1. Request ID injection (needed for tracing in all subsequent middleware)
//   2. Helmet (secure HTTP headers)
//   3. CORS
//   4. Compression
//   5. Cookie parser
//   6. Rate limiting (applied to /api/* only — health excluded)
// ---------------------------------------------------------------------------

export function applySecurityMiddleware(app: Application): void {
  // 1. Inject unique request ID for tracing
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.requestId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    next();
  });

  // 2. Helmet — sets secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // allow Supabase storage embeds
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // 3. CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server requests (no origin) and whitelisted origins
        if (!origin || config.cors.origins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn({ origin }, 'CORS: blocked request from disallowed origin');
          callback(new Error(`CORS policy: origin ${origin} is not allowed`));
        }
      },
      allowedHeaders: [...config.cors.allowedHeaders] as string[],
      credentials: config.cors.credentials,
    }),
  );

  // 4. Response compression
  app.use(compression());

  // 5. Cookie parsing
  app.use(cookieParser());

  // 6. API rate limiting — applied only to /api/* routes
  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: config.rateLimit.standardHeaders,
    legacyHeaders: config.rateLimit.legacyHeaders,
    message: config.rateLimit.message,
    skip: (req) => {
      // Skip rate limiting for health endpoints
      return req.path.startsWith('/health');
    },
  });

  app.use('/api', apiLimiter);
}
