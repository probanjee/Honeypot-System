/**
 * VIGILANCE Nowhere Esports Intranet - Server Entry Point
 * Starts HTTP server, connects to MongoDB, and registers graceful shutdown hooks.
 */

import { createApp } from './app.js';
import { loadEnvConfig } from './config/env.js';
import { MongoEvidenceRepository } from './repository/mongoEvidenceRepository.js';

async function bootstrap() {
  const env = loadEnvConfig();
  console.log('===============================================================');
  console.log('   VIGILANCE HONEYPOT SENSOR: NOWHERE ESPORTS INTRANET         ');
  console.log('===============================================================');
  console.log(`[INIT] Environment: ${env.nodeEnv}`);
  console.log(`[INIT] Target HTTP Port: ${env.port}`);
  console.log(`[INIT] Connecting to MongoDB Evidence Store at ${env.mongoUri}...`);

  const evidenceRepo = new MongoEvidenceRepository({
    uri: env.mongoUri,
    dbName: env.mongoDbName,
  });

  try {
    await evidenceRepo.connect();
    console.log(`[INIT] MongoDB connected successfully (Database: ${env.mongoDbName})`);
  } catch (err) {
    console.error(`\n[FATAL] MongoDB connection failed: ${(err as Error).message}`);
    console.error('[DIAGNOSTIC] Ensure MongoDB is running locally on port 27017 or launch via Docker:');
    console.error('             docker run -d -p 127.0.0.1:27017:27017 --name vigilance-mongo mongo:7.0');
    console.error('[POLICY] Per VIGILANCE ADR-006, silent in-memory fallback is disabled in development.\n');
    process.exit(1);
  }

  const app = createApp({
    evidenceRepository: evidenceRepo,
    rulesPath: env.rulesPath,
    maxBodySizeBytes: env.maxBodySizeBytes,
  });

  const server = app.listen(env.port, () => {
    console.log(`[READY] Nowhere Esports Intranet active on http://127.0.0.1:${env.port}`);
    console.log('[READY] Decoy pages: http://127.0.0.1:' + env.port + '/');
    console.log('[READY] Tournament API: http://127.0.0.1:' + env.port + '/api/v1/tournaments');
    console.log('[READY] Canary Traps: http://127.0.0.1:' + env.port + '/.env, /admin');
    console.log('===============================================================\n');
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Closing HTTP listener and MongoDB connections...`);
    server.close(async () => {
      await evidenceRepo.close();
      console.log('[SHUTDOWN] Clean exit completed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch(err => {
  console.error('[BOOTSTRAP_ERROR]', err);
  process.exit(1);
});
