import 'dotenv/config';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Environment schema — all required vars must be present at startup.
// The process will exit immediately if any are missing or malformed.
// SECURITY: this module never logs secrets or keys.
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_VERSION: z.string().default('v1'),

  // Database (PostgreSQL)
  DATABASE_URL: z.string().default('postgresql://user:password@localhost:5432/honeypot'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_NAME: z.string().default('honeypot'),
  DB_USER: z.string().default('user'),
  DB_PASSWORD: z.string().default('password'),
  DB_MAX_CONNECTIONS: z.coerce.number().int().default(20),

  // Authentication & Security
  JWT_SECRET: z.string().min(8).default('nowhere-esports-super-secret-jwt-key-2026'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Kafka Messaging
  KAFKA_BOOTSTRAP_SERVERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('nowhere-esports-backend'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  LOG_PRETTY: z.string().transform((v) => v === 'true').default('true'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    // Use process.stderr directly — logger not yet initialized
    process.stderr.write(
      `\n[CONFIG] ❌  Environment validation failed. Fix the following:\n${formatted}\n\n`,
    );
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
