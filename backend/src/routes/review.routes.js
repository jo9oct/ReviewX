import { Router } from 'express';

import {
  create,
  getById,
  list,
  getMetrics,
} from '../controllers/review.controller.js';

import {
  parseMultipartReview,
  handleMultipartError,
  normalizeMultipartReview,
} from '../input/upload/multipart.js';

import {
  optionalAuthenticate,
} from '../middleware/authenticate.js';

const router = Router();

router.use(optionalAuthenticate);

const adaptSourceBody = (req, res, next) => {
  if (req.body && !req.body.source && req.body.code) {
    req.body.source = {
      type: 'paste',
      content: req.body.code,
      fileName: req.body.fileName || 'source.ts',
      language: req.body.language || 'typescript',
    };
  }
  next();
};

router.post(
  '/',
  parseMultipartReview,
  handleMultipartError,
  normalizeMultipartReview,
  adaptSourceBody,
  create,
);

router.get('/metrics', getMetrics);
router.get('/', list);
router.get('/:reviewId', getById);

export default router;
