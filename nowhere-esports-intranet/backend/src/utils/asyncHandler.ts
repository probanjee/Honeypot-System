import { Request, Response, NextFunction, RequestHandler } from 'express';

// ---------------------------------------------------------------------------
// asyncHandler — wraps async route handlers and forwards any thrown errors
// to Express's next() so they reach the centralized error middleware.
//
// Usage:
//   router.get('/route', asyncHandler(async (req, res) => {
//     const data = await someAsyncOperation();
//     res.json(data);
//   }));
// ---------------------------------------------------------------------------

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
