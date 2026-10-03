import {
  createReview,
  executeReviewPipeline,
  getReview,
  listReviews,
  getDashboardMetrics
} from "../services/review.service.js";

import {
  sendSuccess
} from "../utils/response.js";

import {
  logger
} from "../utils/logger.js";

export async function create(
  req,
  res,
  next
) {
  try {
    const initial =
      await createReview({
        input:
          req.body,
        file:
          req.file || null,
        accessContext:
          req.analysisAccess ||
          null
      });

    // Return 202 Accepted immediately with reviewId and status: "pending"
    sendSuccess(
      res,
      {
        reviewId:
          initial.reviewId,
        status:
          "pending",
        message:
          "Review analysis queued."
      },
      202
    );

    // Kick off pipeline in the background using setImmediate
    setImmediate(() => {
      executeReviewPipeline(initial.reviewId, {
        processed: initial.processed,
        access: initial.access,
        language: initial.language
      }).catch((error) => {
        logger.error(
          "Unhandled error in background review pipeline",
          {
            reviewId: initial.reviewId,
            error: error.message,
            stack: error.stack
          }
        );
      });
    });
  } catch (error) {
    next(error);
  }
}

export async function list(
  req,
  res,
  next
) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const reviews = await listReviews({ limit });
    return sendSuccess(res, reviews);
  } catch (error) {
    next(error);
  }
}

export async function getMetrics(
  _req,
  res,
  next
) {
  try {
    const metrics = await getDashboardMetrics();
    return sendSuccess(res, metrics);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req,
  res,
  next
) {
  try {
    const review =
      await getReview(
        req.params.reviewId
      );

    return sendSuccess(
      res,
      review
    );
  } catch (error) {
    next(error);
  }
}
