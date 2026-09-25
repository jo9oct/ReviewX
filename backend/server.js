/**
 * ReviewX API — server entry point.
 *
 * Responsibilities:
 *   1. Load env config (via src/config/env.js which imports dotenv)
 *   2. Connect to MongoDB
 *   3. Create the Express app
 *   4. Start the HTTP server
 *   5. Handle graceful shutdown (SIGTERM / SIGINT)
 */

import { createApp, config } from './src/app.js';
import { connectDB }         from './src/config/db.js';
import { logger }            from './src/utils/logger.js';

async function start() {
  // ── Connect database first ─────────────────────────────────────────────────
  // connectDB() calls process.exit(1) on failure, so the server never starts
  // with a broken DB connection.
  await connectDB();

  // ── Create and start Express app ──────────────────────────────────────────
  const app    = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`ReviewX API  ·  ${config.env.toUpperCase()}`);
    logger.info(`Server       →  http://localhost:${config.port}`);
    logger.info(`Health check →  http://localhost:${config.port}/api/v1/health`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Allows in-flight requests to complete before the process exits.
  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully…`);

    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        const mongoose = await import('mongoose');
        await mongoose.default.connection.close();
        logger.info('MongoDB connection closed');
      } catch (err) {
        logger.error('Error closing MongoDB connection', err.message);
      }
      process.exit(0);
    });

    // Force-kill after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Catch unhandled promise rejections as a safety net
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
    // Don't crash in development; do crash in production so the process
    // manager can restart cleanly.
    if (config.isProd) process.exit(1);
  });
}

start();
