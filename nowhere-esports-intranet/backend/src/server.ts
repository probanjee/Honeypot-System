// ---------------------------------------------------------------------------
// Server entry point.
//
// 1. Loads and validates environment (via config/env.ts — imported by app)
// 2. Creates the Express application
// 3. Binds to the configured port
// 4. Handles graceful shutdown on SIGTERM / SIGINT
// ---------------------------------------------------------------------------

import { createApp } from './app/app';
import { config } from './config/app';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const app = createApp();

  const server = app.listen(config.server.port, () => {
    logger.info(
      {
        port: config.server.port,
        env: config.server.nodeEnv,
        apiVersion: config.server.apiVersion,
      },
      `🚀  Nowhere Esports Backend running → http://localhost:${config.server.port}`,
    );

    logger.info(
      `📡  Health check → http://localhost:${config.server.port}/health`,
    );

    logger.info(
      `🔌  API base    → http://localhost:${config.server.port}/api/${config.server.apiVersion}`,
    );
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────

  function shutdown(signal: string): void {
    logger.info(`Received ${signal} — starting graceful shutdown...`);

    server.close((err) => {
      if (err) {
        logger.error({ err }, 'Error during server close');
        process.exit(1);
      }

      logger.info('HTTP server closed. Goodbye! 👋');
      process.exit(0);
    });

    // Force shutdown after 10 seconds if server doesn't close cleanly
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ── Unhandled rejection / exception safety net ────────────────────────────

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection — shutting down');
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception — shutting down');
    shutdown('uncaughtException');
  });
}

bootstrap().catch((err) => {
  // Logger may not be initialized if env validation fails
  process.stderr.write(`Bootstrap error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
