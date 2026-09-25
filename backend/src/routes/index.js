/**
 * Root router — mounts all feature routers under a versioned prefix.
 *
 * Add new feature routers here as the API grows:
 *   import reviewRoutes from './review.routes.js';
 *   router.use('/reviews', reviewRoutes);
 */

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes   from './auth.routes.js';

const router = Router();

// ── Mounted routes ───────────────────────────────────────────────────────────
router.use('/health', healthRoutes);
router.use('/auth',   authRoutes);

// Future routes go here:
// router.use('/reviews', reviewRoutes);
// router.use('/users',   userRoutes);

export default router;
