/**
 * VIGILANCE Nowhere Esports Intranet - Safe Error Handler Middleware
 * Prevents stack trace leaks or implementation disclosure to adversaries.
 */

import { Request, Response, NextFunction } from 'express';

export function safeErrorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const status = err.status || err.statusCode || 500;

  // Log error internally for security engineering diagnostics
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[INTERNAL_ERROR] ${req.method} ${req.path}: ${err.message}`);
  }

  // If request expects HTML / browser view
  if (req.accepts('html')) {
    if (status === 500) {
      res.status(500).render('errors/500', {
        title: 'Internal Server Error',
        message: 'The requested operation encountered an unexpected node processing error.',
      });
      return;
    }
    if (status === 403) {
      res.status(403).render('errors/403', {
        title: 'Staff Portal Access Denied',
        message: 'Active staff session not found. Please log in via the authorized SSO gateway.',
      });
      return;
    }
    if (status === 401) {
      res.status(401).render('errors/401', {
        title: 'Authentication Required',
        message: 'The requested resource requires valid authentication credentials.',
      });
      return;
    }
    res.status(status).render('errors/404', {
      title: 'Page Not Found',
      message: 'The requested resource could not be found or access is restricted.',
    });
    return;
  }

  // If request expects JSON / API client
  res.status(status).json({
    error: status === 404 ? 'Not Found' : 'Internal Server Error',
    message: 'An unexpected error occurred while processing the request.',
    request_id: req.securityContext?.event_id || 'unknown',
  });
}
