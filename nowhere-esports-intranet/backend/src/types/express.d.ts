import { AuthUser } from './auth';

// ---------------------------------------------------------------------------
// Express Request augmentation — adds req.user and req.requestId
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user — populated by authenticate middleware */
      user?: AuthUser;
      /** Unique request identifier from X-Request-ID header or generated */
      requestId?: string;
    }
  }
}

export {};
