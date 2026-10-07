import {
  Router,
} from 'express';

import {
  createReview,
  getReview,
  getAllReviews,
} from '../controllers/review.controller.js';

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

/*
 * Get all reviews.
 *
 * Must be declared BEFORE /:reviewId
 * so "all" is not interpreted as a review ID.
 */
router.get(
  '/all',
  accessMiddleware(),
  getAllReviews,
);

router.get(
  '/:reviewId',
  accessMiddleware(),
  getReview,
);

export default router;