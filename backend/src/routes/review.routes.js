import {
  Router
} from "express";

import {
  create,
  getById
} from "../controllers/review.controller.js";

import {
  uploadSingleSource
} from "../middleware/upload.middleware.js";

import {
  validateReviewInput
} from "../middleware/validation.middleware.js";

import {
  reviewRequestSchema
} from "../validators/review.validator.js";

const router =
  Router();

router.post(
  "/",
  uploadSingleSource,
  validateReviewInput(
    reviewRequestSchema
  ),
  create
);

router.get(
  "/:reviewId",
  getById
);

export default router;