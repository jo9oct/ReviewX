import {
  Router,
} from 'express';

import {
  createScheduledReview,
  getScheduledReviews,
  getScheduledReview,
  cancelScheduledReview,
} from '../controllers/scheduledReview.controller.js';

import {
  accessMiddleware,
  requireFeature,
} from '../middleware/access.middleware.js';

const router =
  Router();

router.post(
  '/',
  accessMiddleware(),
  requireFeature(
    'scheduledReviews',
  ),
  createScheduledReview,
);

router.get(
  '/',
  accessMiddleware(),
  requireFeature(
    'scheduledReviews',
  ),
  getScheduledReviews,
);

router.get(
  '/:scheduleId',
  accessMiddleware(),
  requireFeature(
    'scheduledReviews',
  ),
  getScheduledReview,
);

router.delete(
  '/:scheduleId',
  accessMiddleware(),
  requireFeature(
    'scheduledReviews',
  ),
  cancelScheduledReview,
);

export default router;