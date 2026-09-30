import { Router } from 'express';

import {
  createReview,
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

const router = Router();

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

export default router;