/**
 * HTTP request logger middleware using morgan.
 *
 * - Development: colourful 'dev' format — concise, human-readable.
 * - Production:  'combined' Apache format — structured, log-aggregator friendly.
 *
 * Morgan is wired to write to the same stream as our logger so all
 * output flows through stdout consistently.
 */

import morgan from 'morgan';
import { config } from '../config/env.js';

const format = config.isDev ? 'dev' : 'combined';

export const requestLogger = morgan(format, {
  // Skip health-check noise in production logs
  skip: (req) => config.isProd && req.path === '/health',
});
