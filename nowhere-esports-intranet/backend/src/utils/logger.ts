import pino from 'pino';
import { config } from '../config/app';

// ---------------------------------------------------------------------------
// Application-wide Pino logger.
//
// SECURITY: The redact list below ensures that secrets, tokens, and credentials
// are NEVER written to log output regardless of log level.
// ---------------------------------------------------------------------------

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.passwordConfirm',
  'req.body.token',
  'req.body.apiKey',
  'req.body.secret',
  'password',
  'token',
  'jwt',
  'apiKey',
  'secret',
  'serviceRoleKey',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_JWT_SECRET',
];

const transport = config.logging.pretty
  ? pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  })
  : undefined;

export const logger = pino(
  {
    level: config.logging.level,
    redact: {
      paths: REDACTED_PATHS,
      censor: '[REDACTED]',
    },
    base: {
      env: config.server.nodeEnv,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport,
);

export type Logger = typeof logger;
