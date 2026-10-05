export const createSystemMetrics =
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
      requestCompleted({
        method,
        route,
        statusCode,
        durationMs,
      }) {
        metricsService.increment(
          "http.requests",
        );

        metricsService.increment(
          `http.requests.${method}`,
        );

        metricsService.increment(
          `http.status.${statusCode}`,
        );

        metricsService.recordDuration(
          `http.duration.${method}`,
          durationMs,
        );

        if (route) {
          metricsService.increment(
            `http.route.${route}`,
          );
        }
      },

      requestFailed() {
        metricsService.increment(
          "http.errors",
        );
      },

      queueJobCompleted(
        queueName,
      ) {
        metricsService.increment(
          `queue.${queueName}.completed`,
        );
      },

      queueJobFailed(
        queueName,
      ) {
        metricsService.increment(
          `queue.${queueName}.failed`,
        );
      },
    };
  };