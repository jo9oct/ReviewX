import {
  Router,
} from 'express';

import {
  authenticate,
} from '../middleware/authenticate.js';

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
  authenticate,
  accessMiddleware(),
  requireFeature(
    'scheduledReviews',
  ),
  createScheduledReview,
);

router.get(
  '/',
  authenticate,
  accessMiddleware(),
  requireFeature(
    'scheduledReviews',
  ),
  getScheduledReviews,
);

router.get(
  '/:scheduleId',
  authenticate,
  accessMiddleware(),
  requireFeature(
    'scheduledReviews',
  ),
  getScheduledReview,
);

router.delete(
  '/:scheduleId',
  authenticate,
  accessMiddleware(),
  requireFeature(
    'scheduledReviews',
  ),
  cancelScheduledReview,
);

export default router;