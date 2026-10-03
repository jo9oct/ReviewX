import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import reviewRoutes from './review.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/reviews', reviewRoutes);
router.use('/reports', reportRoutes);

export default router;
