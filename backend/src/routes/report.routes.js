
import {
  Router
} from "express";

import {
  create,
  getById,
  getByReviewId
} from "../controllers/report.controller.js";

import {
  validateBody
} from "../middleware/validation.middleware.js";

import {
  createReportSchema
} from "../validators/report.validator.js";

const router =
  Router();

router.post(
  "/",
  validateBody(
    createReportSchema
  ),
  create
);

router.get(
  "/review/:reviewId",
  getByReviewId
);

router.get(
  "/:reportId",
  getById
);

export default router;