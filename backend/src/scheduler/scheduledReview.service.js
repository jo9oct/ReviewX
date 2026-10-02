import {
  assertFeatureAccess,
} from "../access/access.service.js";

import {
  enqueueReviewJob,
} from "../jobs/review.job.js";

const SCHEDULED_REVIEW_FEATURE =
  "scheduledReviews";

const MIN_INTERVAL_SECONDS =
  60;

const normalizeOwnerId = (
  ownerId,
) => {
  if (
    typeof ownerId !== "string" ||
    !ownerId.trim()
  ) {
    throw new TypeError(
      "Owner ID is required.",
    );
  }

  return ownerId.trim();
};

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

const normalizeIntervalSeconds = (
  intervalSeconds,
) => {
  const value =
    Number(
      intervalSeconds,
    );

  if (
    !Number.isInteger(value) ||
    value < MIN_INTERVAL_SECONDS
  ) {
    throw new TypeError(
      `Schedule interval must be at least ${MIN_INTERVAL_SECONDS} seconds.`,
    );
  }

  return value;
};

const calculateNextRunAt = (
  intervalSeconds,
  from = new Date(),
) => {
  const baseTime =
    new Date(from);

  if (
    Number.isNaN(
      baseTime.getTime(),
    )
  ) {
    throw new TypeError(
      "A valid schedule start time is required.",
    );
  }

  return new Date(
    baseTime.getTime() +
      intervalSeconds *
        1000,
  );
};

const createScheduledReviewService =
  ({
    reviewRepository,
    scheduledReviewRepository,
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
      !scheduledReviewRepository ||
      typeof scheduledReviewRepository.create !==
        "function" ||
      typeof scheduledReviewRepository.findById !==
        "function"
    ) {
      throw new TypeError(
        "Scheduled review repository is required.",
      );
    }

    return {
      async createSchedule({
        ownerId,
        reviewId,
        intervalSeconds,
      }) {
        /*
         * Scheduling is Enterprise-only.
         */
        assertFeatureAccess(
          SCHEDULED_REVIEW_FEATURE,
        );

        const normalizedOwnerId =
          normalizeOwnerId(
            ownerId,
          );

        const normalizedReviewId =
          normalizeReviewId(
            reviewId,
          );

        const normalizedInterval =
          normalizeIntervalSeconds(
            intervalSeconds,
          );

        const review =
          await reviewRepository.findById(
            normalizedReviewId,
          );

        if (!review) {
          const error =
            new Error(
              "Review not found.",
            );

          error.code =
            "REVIEW_NOT_FOUND";

          error.statusCode =
            404;

          throw error;
        }

        /*
         * The review must belong to
         * the same owner creating
         * the schedule.
         */
        if (
          !review.ownerId ||
          String(
            review.ownerId,
          ) !==
            normalizedOwnerId
        ) {
          const error =
            new Error(
              "Review does not belong to the requested owner.",
            );

          error.code =
            "REVIEW_OWNER_MISMATCH";

          error.statusCode =
            403;

          throw error;
        }

        /*
         * Only completed reviews can
         * be scheduled for recurring
         * execution.
         */
        if (
          review.status !==
          "completed"
        ) {
          const error =
            new Error(
              "Only completed reviews can be scheduled.",
            );

          error.code =
            "REVIEW_NOT_COMPLETED";

          error.statusCode =
            409;

          throw error;
        }

        const nextRunAt =
          calculateNextRunAt(
            normalizedInterval,
          );

        const schedule =
          await scheduledReviewRepository.create(
            {
              ownerId:
                normalizedOwnerId,

              reviewId:
                normalizedReviewId,

              intervalSeconds:
                normalizedInterval,

              nextRunAt,
            },
          );

        return {
          scheduleId:
            schedule.scheduleId.toString(),

          ownerId:
            schedule.ownerId,

          reviewId:
            schedule.reviewId.toString(),

          intervalSeconds:
            schedule.intervalSeconds,

          nextRunAt:
            schedule.nextRunAt,

          enabled:
            schedule.enabled,
        };
      },

      async getSchedule({
        ownerId,
        scheduleId,
      }) {
        assertFeatureAccess(
          SCHEDULED_REVIEW_FEATURE,
        );

        const normalizedOwnerId =
          normalizeOwnerId(
            ownerId,
          );

        const schedule =
          await scheduledReviewRepository.findById(
            scheduleId,
          );

        if (!schedule) {
          const error =
            new Error(
              "Scheduled review not found.",
            );

          error.code =
            "SCHEDULE_NOT_FOUND";

          error.statusCode =
            404;

          throw error;
        }

        if (
          String(
            schedule.ownerId,
          ) !==
          normalizedOwnerId
        ) {
          const error =
            new Error(
              "Scheduled review does not belong to the requested owner.",
            );

          error.code =
            "SCHEDULE_OWNER_MISMATCH";

          error.statusCode =
            403;

          throw error;
        }

        return {
          scheduleId:
            schedule.scheduleId.toString(),

          ownerId:
            schedule.ownerId,

          reviewId:
            schedule.reviewId.toString(),

          intervalSeconds:
            schedule.intervalSeconds,

          nextRunAt:
            schedule.nextRunAt,

          lastRunAt:
            schedule.lastRunAt,

          enabled:
            schedule.enabled,

          createdAt:
            schedule.createdAt,

          updatedAt:
            schedule.updatedAt,
        };
      },

      async listSchedules({
        ownerId,
      }) {
        assertFeatureAccess(
          SCHEDULED_REVIEW_FEATURE,
        );

        const normalizedOwnerId =
          normalizeOwnerId(
            ownerId,
          );

        const schedules =
          await scheduledReviewRepository.findByOwnerId(
            normalizedOwnerId,
          );

        return schedules.map(
          (schedule) => ({
            scheduleId:
              schedule.scheduleId.toString(),

            ownerId:
              schedule.ownerId,

            reviewId:
              schedule.reviewId.toString(),

            intervalSeconds:
              schedule.intervalSeconds,

            nextRunAt:
              schedule.nextRunAt,

            lastRunAt:
              schedule.lastRunAt,

            enabled:
              schedule.enabled,

            createdAt:
              schedule.createdAt,

            updatedAt:
              schedule.updatedAt,
          }),
        );
      },

      async cancelSchedule({
        ownerId,
        scheduleId,
      }) {
        assertFeatureAccess(
          SCHEDULED_REVIEW_FEATURE,
        );

        const normalizedOwnerId =
          normalizeOwnerId(
            ownerId,
          );

        const schedule =
          await scheduledReviewRepository.findById(
            scheduleId,
          );

        if (!schedule) {
          const error =
            new Error(
              "Scheduled review not found.",
            );

          error.code =
            "SCHEDULE_NOT_FOUND";

          error.statusCode =
            404;

          throw error;
        }

        if (
          String(
            schedule.ownerId,
          ) !==
          normalizedOwnerId
        ) {
          const error =
            new Error(
              "Scheduled review does not belong to the requested owner.",
            );

          error.code =
            "SCHEDULE_OWNER_MISMATCH";

          error.statusCode =
            403;

          throw error;
        }

        const cancelled =
          await scheduledReviewRepository.disable(
            schedule.scheduleId.toString(),
          );

        return {
          scheduleId:
            schedule.scheduleId.toString(),

          enabled:
            cancelled?.enabled ??
            false,

          status:
            "cancelled",
        };
      },

      async queueScheduledReview({
        schedule,
      }) {
        if (
          !schedule ||
          !schedule.scheduleId
        ) {
          throw new TypeError(
            "Schedule is required.",
          );
        }

        if (
          schedule.enabled !==
          true
        ) {
          return {
            skipped:
              true,

            reason:
              "Schedule is disabled.",
          };
        }

        const reviewId =
          schedule.reviewId.toString();

        const job =
          await enqueueReviewJob({
            reviewId,
          });

        return {
          skipped:
            false,

          scheduleId:
            schedule.scheduleId.toString(),

          reviewId,

          jobId:
            job.id,

          status:
            "queued",
        };
      },
    };
  };

export {
  createScheduledReviewService,
  calculateNextRunAt,
};