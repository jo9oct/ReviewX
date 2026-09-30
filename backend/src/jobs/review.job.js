import {
  getReviewQueue,
} from "../queue/queue.factory.js";

import {
  JOB_NAMES,
} from "../queue/queue.constants.js";

const normalizeReviewJobData = ({
  reviewId,
}) => {
  if (
    typeof reviewId !== "string" ||
    !reviewId.trim()
  ) {
    throw new TypeError(
      "Review ID is required.",
    );
  }

  return {
    reviewId: reviewId.trim(),
  };
};

export const enqueueReviewJob =
  async ({
    reviewId,
  }) => {
    const queue =
      getReviewQueue();

    const data =
      normalizeReviewJobData({
        reviewId,
      });

    return queue.add(
      JOB_NAMES.REVIEW,
      data,
      {
        jobId: `review:${data.reviewId}`,
      },
    );
  };

export const createReviewProcessor =
  ({
    reviewService,
  }) => {
    if (
      !reviewService ||
      typeof reviewService.executeReview !==
        "function"
    ) {
      throw new TypeError(
        "A review service with executeReview is required.",
      );
    }

    return async (job) => {
      const data =
        normalizeReviewJobData(
          job.data || {},
        );

      return reviewService.executeReview({
        reviewId: data.reviewId,
      });
    };
  };