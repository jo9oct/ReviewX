/**
 * MongoDB connection via Mongoose.
 *
 * - Connects once on startup; subsequent calls are no-ops (Mongoose
 *   maintains a single connection pool internally).
 * - Logs connection events so the server output is readable.
 * - Handles transient disconnects automatically via Mongoose's built-in
 *   reconnection logic (serverSelectionTimeoutMS controls the give-up window).
 */

import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45_000,
    });
    logger.info(`MongoDB connected — ${mongoose.connection.host}`);
  } catch (err) {
    logger.error('MongoDB connection failed', err.message);
    if (config.isProd) {
      // In production, crash fast so the process manager can restart.
      process.exit(1);
    }
    // In development, warn and continue — the API will respond 503 on /health
    // but all other routes are still reachable for testing.
    logger.warn('Continuing without MongoDB (development mode). Start mongod to enable DB features.');
  }
}

// Log subsequent lifecycle events
mongoose.connection.on('disconnected', () =>
  logger.warn('MongoDB disconnected — retrying…'),
);
mongoose.connection.on('reconnected', () =>
  logger.info('MongoDB reconnected'),
);
mongoose.connection.on('error', (err) =>
  logger.error('MongoDB error', err.message),
);
