import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors';

// ---------------------------------------------------------------------------
// notFound — catch-all 404 handler.
// Mount AFTER all other routes.
// ---------------------------------------------------------------------------

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}
