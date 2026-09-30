import queueConfig from "../config/queue.config.js";

export const QUEUE_NAMES = Object.freeze({
  REVIEW: queueConfig.queues.review,
  REPORT: queueConfig.queues.report,
  CLEANUP: queueConfig.queues.cleanup,
  NOTIFICATION:
    queueConfig.queues.notification,
});

export const JOB_NAMES = Object.freeze({
  REVIEW: "review.execute",
  REPORT: "report.generate",
  CLEANUP: "cleanup.execute",
  NOTIFICATION: "notification.send",
});

export const QUEUE_DEFAULT_OPTIONS =
  Object.freeze({
    attempts: queueConfig.attempts,

    backoff: {
      type: "exponential",
      delay: queueConfig.backoffMs,
    },

    removeOnComplete: {
      count: queueConfig.removeOnComplete,
    },

    removeOnFail: {
      count: queueConfig.removeOnFail,
    },
  });