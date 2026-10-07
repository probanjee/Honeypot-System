import { Application, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Request logger middleware using pino-http.
//
// Logs every incoming request and outgoing response with:
//   - method, url, statusCode, responseTime
//   - requestId for distributed tracing
//
// SECURITY: Redacts Authorization header and cookie values.
// SECURITY: Never logs request body (may contain passwords / PII).
// ---------------------------------------------------------------------------

export function applyRequestLogger(app: Application): void {
  app.use(
    pinoHttp({
      logger,
      // Auto-assign requestId from req.requestId if already set
      genReqId: (req: Request) => req.requestId ?? 'no-id',
      // Redact sensitive headers from log output
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        censor: '[REDACTED]',
      },
      // Custom log level based on status code
      customLogLevel: (_req: Request, res: Response, _err?: Error) => {
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // Minimal request/response summary — use loose typing for pino-http serializers
      serializers: {
        req: (req: Record<string, unknown>) => ({
          method: req['method'],
          url: req['url'],
          requestId: req['id'],
          remoteAddress: (req['socket'] as { remoteAddress?: string } | undefined)?.remoteAddress,
        }),
        res: (res: Record<string, unknown>) => ({
          statusCode: res['statusCode'],
        }),
      },
      // Suppress logging for health checks to reduce noise
      autoLogging: {
        ignore: (req: Request) => {
          const url = req.url ?? '';
          return url.includes('/health');
        },
      },
    }),
  );
}

// Standalone request logger for manual usage in controllers
export { logger };

// Express-compatible error logger helper
export function logError(err: Error, req: Request): void {
  logger.error(
    {
      requestId: req.requestId,
      errorName: err.name,
      errorMessage: err.message,
    },
    'Request error',
  );
}
