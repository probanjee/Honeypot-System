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
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_VERSION: z.string().default('v1'),

  // Supabase
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_ANON_KEY: z.string().min(1, { message: 'SUPABASE_ANON_KEY is required' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { message: 'SUPABASE_SERVICE_ROLE_KEY is required' }),
  SUPABASE_JWT_SECRET: z.string().min(1, { message: 'SUPABASE_JWT_SECRET is required' }),

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
