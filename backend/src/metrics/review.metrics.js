export const createReviewMetrics =
  ({
    metricsService,
  }) => {
    if (
      !metricsService ||
      typeof metricsService.increment !==
        "function"
    ) {
      throw new TypeError(
        "Metrics service is required.",
      );
    }

    return {
      reviewCreated() {
        metricsService.increment(
          "reviews.created",
        );
      },

      reviewQueued() {
        metricsService.increment(
          "reviews.queued",
        );
      },

      reviewStarted() {
        metricsService.increment(
          "reviews.started",
        );
      },

      reviewCompleted({
        durationMs,
      }) {
        metricsService.increment(
          "reviews.completed",
        );

        metricsService.recordDuration(
          "reviews.duration",
          durationMs,
        );
      },

      reviewFailed() {
        metricsService.increment(
          "reviews.failed",
        );
      },

      findingsCreated({
        count,
      }) {
        if (
          Number.isFinite(count) &&
          count > 0
        ) {
          metricsService.increment(
            "findings.created",
            count,
          );
        }
      },

      aiCompleted() {
        metricsService.increment(
          "reviews.ai_completed",
        );
      },

      aiFailed() {
        metricsService.increment(
          "reviews.ai_failed",
        );
      },
    };
  };