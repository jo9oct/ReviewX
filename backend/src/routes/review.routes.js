// STATUS: UPDATED

import {
  Router,
} from 'express';

import {
  createReview,
  getReview,
  getAllReviews,
} from '../controllers/review.controller.js';

import {
  authenticate,
} from '../middleware/authenticate.js';

import {
  accessMiddleware,
  enforceReviewLimits,
} from '../middleware/access.middleware.js';

import {
  validationMiddleware,
} from '../middleware/validation.middleware.js';

import {
  reviewSchema,
} from '../validators/review.validator.js';

import {
  parseMultipartReview,
  normalizeMultipartReview,
  handleMultipartError,
} from '../input/upload/multipart.js';

const router =
  Router();

router.post(
  '/',
  authenticate,
  parseMultipartReview,
  handleMultipartError,
  normalizeMultipartReview,
  validationMiddleware(
    reviewSchema,
    'body',
  ),
  accessMiddleware(),
  enforceReviewLimits,
  createReview,
);

router.get(
  '/all',
  authenticate,
  accessMiddleware(),
  getAllReviews,
);

router.get(
  '/:reviewId',
  authenticate,
  accessMiddleware(),
  getReview,
);

export default router;