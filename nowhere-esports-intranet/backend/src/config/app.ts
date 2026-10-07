import { env } from './env';

// ---------------------------------------------------------------------------
// Central application configuration derived from validated environment vars.
// All other modules should import from here rather than reading process.env.
// ---------------------------------------------------------------------------

export const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    apiVersion: env.API_VERSION,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    // serviceRoleKey intentionally not exported here — accessed only in supabase.ts
    jwtSecret: env.SUPABASE_JWT_SECRET,
  },

  cors: {
    origins: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as string[],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests — please try again later.',
      status: 429,
    },
  },

  logging: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY,
  },
} as const;

export type Config = typeof config;
