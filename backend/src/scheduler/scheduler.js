import {
  createScheduledReviewService,
} from './scheduledReview.service.js';

import scheduledReviewRepository from '../database/repositories/scheduledReview.repository.js';

import reviewRepository from '../database/repositories/review.repository.js';

import environment from '../config/environment.js';

const getSchedulerConfig = () => {
  const config =
    environment.scheduler || {};

  return {
    enabled:
      config.enabled !== false,

    intervalMs:
      Math.max(
        Number(
          config.minIntervalSeconds ||
            60,
        ),
        60,
      ) * 1000,
  };
};

const createScheduler = ({
  logger = console,
} = {}) => {
  const config =
    getSchedulerConfig();

  const scheduledReviewService =
    createScheduledReviewService({
      reviewRepository,

      scheduledReviewRepository,
    });

  let timer = null;

  let running = false;

  const processDueSchedules =
    async () => {
      if (running) {
        return {
          skipped: true,

          reason:
            'Scheduler cycle already running.',
        };
      }

      running = true;

      try {
        const now =
          new Date();

        const schedules =
          await scheduledReviewRepository.findDue({
            now,

            limit: 100,
          });

        if (
          schedules.length ===
          0
        ) {
          return {
            processed: 0,

            claimed: 0,

            queued: 0,

            failed: 0,
          };
        }

        let claimed = 0;

        let queued = 0;

        let failed = 0;

        for (
          const schedule of schedules
        ) {
          try {
            /*
             * Atomically claim the schedule.
             *
             * If another scheduler instance
             * already claimed it, null is
             * returned.
             */
            const claimedSchedule =
              await scheduledReviewRepository.claimDueSchedule(
                {
                  scheduleId:
                    schedule.scheduleId.toString(),

                  now,
                },
              );

            if (
              !claimedSchedule
            ) {
              continue;
            }

            claimed += 1;

            /*
             * The schedule has already been
             * advanced atomically.
             *
             * Now enqueue the actual review.
             */
            await scheduledReviewService.queueScheduledReview(
              {
                schedule:
                  claimedSchedule,
              },
            );

            queued += 1;
          } catch (
            error
          ) {
            failed += 1;

            logger.error(
              '[scheduler] failed to process scheduled review',
              {
                scheduleId:
                  schedule.scheduleId?.toString?.(),

                reviewId:
                  schedule.reviewId?.toString?.(),

                error,
              },
            );
          }
        }

        return {
          processed:
            schedules.length,

          claimed,

          queued,

          failed,
        };
      } finally {
        running = false;
      }
    };

  const start = async () => {
    if (!config.enabled) {
      logger.info(
        '[scheduler] disabled',
      );

      return {
        started: false,

        reason:
          'Scheduler is disabled.',
      };
    }

    if (timer) {
      return {
        started: false,

        reason:
          'Scheduler is already running.',
      };
    }

    /*
     * Process due schedules immediately
     * on startup.
     */
    try {
      await processDueSchedules();
    } catch (
      error
    ) {
      logger.error(
        '[scheduler] initial cycle failed',
        error,
      );
    }

    timer =
      setInterval(
        async () => {
          try {
            await processDueSchedules();
          } catch (
            error
          ) {
            logger.error(
              '[scheduler] cycle failed',
              error,
            );
          }
        },
        config.intervalMs,
      );

    logger.info(
      `[scheduler] started with ${config.intervalMs}ms polling interval`,
    );

    return {
      started: true,

      intervalMs:
        config.intervalMs,
    };
  };

  const stop = () => {
    if (!timer) {
      return false;
    }

    clearInterval(
      timer,
    );

    timer = null;

    logger.info(
      '[scheduler] stopped',
    );

    return true;
  };

  const shutdown = () => {
    stop();
  };

  return {
    start,

    stop,

    shutdown,

    processDueSchedules,
  };
};

export {
  createScheduler,
};