/**
 * Security middleware bundle.
 *
 * Exports an array of middleware to be spread onto the Express app:
 *   app.use(...security);
 *
 * Includes:
 *   - helmet:           Sets secure HTTP headers (XSS, clickjacking, MIME sniffing, etc.)
 *   - cors:             Whitelists origins from config; rejects all others in production
 *   - express-rate-limit: Caps requests per IP window to prevent brute-force / DoS
 */

import helmet   from 'helmet';
import cors     from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

// ── Helmet ───────────────────────────────────────────────────────────────────
const helmetMiddleware = helmet({
  // Allow cross-origin resource loading for fonts/images in the SPA
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = config.corsOrigin
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) in dev
    if (!origin && config.isDev) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin "${origin}" is not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,  // default: 15 minutes
  max:      config.rateLimitMax,       // default: 100 requests per window
  standardHeaders: 'draft-7',          // RateLimit-* response headers (RFC draft 7)
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'Too many requests — please slow down and try again later.',
  },
  // Skip rate limiting for health checks so load balancers aren't blocked
  skip: (req) => req.path === '/health',
});

export const security = [helmetMiddleware, corsMiddleware, limiter];
