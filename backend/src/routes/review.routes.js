import { Router } from "express";
import {
  create,
  getById,
  list,
  getMetrics
} from "../controllers/review.controller.js";
import { uploadSingleSource } from "../middleware/upload.middleware.js";
import { validateReviewInput } from "../middleware/validation.middleware.js";
import { reviewRequestSchema } from "../validators/review.validator.js";
import { optionalAuthenticate } from "../middleware/authenticate.js";

const router = Router();

router.use(optionalAuthenticate);

router.post(
  "/",
  uploadSingleSource,
  validateReviewInput(reviewRequestSchema),
  create
);

router.get("/metrics", getMetrics);
router.get("/", list);
router.get("/:reviewId", getById);

export default router;
