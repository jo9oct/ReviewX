import express from "express";
import rateLimit from "express-rate-limit";
import { submitFeedback } from "../controllers/feedback.controller.js";

const router = express.Router();

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many feedback submissions. Please try again later.",
  },
  skip: () => process.env.NODE_ENV === "test",
});

router.post("/", feedbackLimiter, submitFeedback);

export default router;
