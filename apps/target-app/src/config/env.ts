import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  
  // PostgreSQL Database
  DATABASE_URL: z.string().default('postgresql://user:password@localhost:5432/honeypot'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_NAME: z.string().default('honeypot'),
  DB_USER: z.string().default('user'),
  DB_PASSWORD: z.string().default('password'),
  DB_MAX_CONNECTIONS: z.coerce.number().int().default(20),

  // Authentication & JWT
  JWT_SECRET: z.string().min(8).default('nowhere-esports-super-secret-jwt-key-2026'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Kafka Messaging
  KAFKA_BOOTSTRAP_SERVERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('nowhere-esports-sensor'),
  KAFKA_ENABLED: z.string().transform((v) => v === 'true').default('false'),

  // Honeypot Blocking Threshold
  HONEYPOT_BLOCK_THRESHOLD: z.coerce.number().int().default(7),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
