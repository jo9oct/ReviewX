import {
  enqueueReviewJob,
} from "../jobs/review.job.js";

const normalizeReviewId = (
  reviewId,
) => {
  if (
    typeof reviewId !== "string" ||
    !reviewId.trim()
  ) {
    throw new TypeError(
      "Review ID is required.",
    );
  }

  return reviewId.trim();
};

export const createScheduledReviewService =
  ({
    reviewRepository,
    accessService,
  }) => {
    if (
      !reviewRepository ||
      typeof reviewRepository.findById !==
        "function"
    ) {
      throw new TypeError(
        "Review repository is required.",
      );
    }

    if (
      !accessService ||
      typeof accessService.canCreateReview !==
        "function"
    ) {
      throw new TypeError(
        "Access service is required.",
      );
    }

    return {
      async queueScheduledReview({
        reviewId,
        ownerId,
      }) {
        const id =
          normalizeReviewId(
            reviewId,
          );

        const review =
          await reviewRepository.findById(
            id,
          );

        if (!review) {
          const error = new Error(
            "Scheduled review not found.",
          );

          error.statusCode = 404;

          throw error;
        }

        if (
          ownerId &&
          review.ownerId &&
          String(review.ownerId) !==
            String(ownerId)
        ) {
          const error = new Error(
            "Review does not belong to the requested owner.",
          );

          error.statusCode = 403;

          throw error;
        }

        await accessService.canCreateReview({
          ownerId,
        });

        const job =
          await enqueueReviewJob({
            reviewId: id,
          });

        return {
          reviewId: id,
          jobId: job.id,
          status: "queued",
        };
      },
    };
  };