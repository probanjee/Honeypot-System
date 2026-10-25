/**
 * VIGILANCE Nowhere Esports Intranet - Request Body Parser Middleware
 * Enforces a strict 4KB request body size limit to prevent memory exhaustion / ReDoS attacks.
 */

import express, { Request, Response, NextFunction } from 'express';

export function configureBodyParsers(app: express.Application, maxBytes = 4096): void {
  const limit = `${maxBytes}b`;

  // Parse JSON bodies
  app.use(express.json({
    limit,
    strict: false,
  }));

  // Parse URL-encoded form data (from HTML forms like /login)
  app.use(express.urlencoded({
    extended: false,
    limit,
  }));

  // Parse plain text / XML / raw text payloads for non-standard attack probes
  app.use(express.text({
    limit,
    type: ['text/*', 'application/xml', 'application/x-yaml'],
  }));

  // Safe handler for body-parser payload size errors
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      res.status(413).json({
        error: 'Payload Too Large',
        message: 'Request entity exceeds bounded limit of 4096 bytes.',
      });
      return;
    }
    next(err);
  });
}
