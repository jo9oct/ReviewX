const schedules = new Map();

const normalizeInterval = (
  intervalMs,
) => {
  const value = Number(
    intervalMs,
  );

  if (
    !Number.isFinite(value) ||
    value < 60_000
  ) {
    throw new Error(
      "Scheduled review interval must be at least 60000 milliseconds.",
    );
  }

  return value;
};

export const createScheduler = ({
  scheduledReviewService,
  logger = console,
}) => {
  if (
    !scheduledReviewService ||
    typeof scheduledReviewService.queueScheduledReview !==
      "function"
  ) {
    throw new TypeError(
      "Scheduled review service is required.",
    );
  }

  const schedule = ({
    scheduleId,
    reviewId,
    ownerId,
    intervalMs,
  }) => {
    if (
      typeof scheduleId !== "string" ||
      !scheduleId.trim()
    ) {
      throw new TypeError(
        "Schedule ID is required.",
      );
    }

    const id =
      scheduleId.trim();

    if (schedules.has(id)) {
      throw new Error(
        `Schedule already exists: ${id}`,
      );
    }

    const interval =
      normalizeInterval(
        intervalMs,
      );

    const timer = setInterval(
      async () => {
        try {
          await scheduledReviewService.queueScheduledReview(
            {
              reviewId,
              ownerId,
            },
          );
        } catch (error) {
          logger.error(
            `[scheduler] failed to queue schedule ${id}`,
            error,
          );
        }
      },
      interval,
    );

    schedules.set(id, timer);

    return {
      scheduleId: id,
      reviewId,
      intervalMs: interval,
    };
  };

  const cancel = (
    scheduleId,
  ) => {
    const id =
      String(scheduleId || "").trim();

    const timer =
      schedules.get(id);

    if (!timer) {
      return false;
    }

    clearInterval(timer);
    schedules.delete(id);

    return true;
  };

  const shutdown = () => {
    for (const timer of schedules.values()) {
      clearInterval(timer);
    }

    schedules.clear();
  };

  return {
    schedule,
    cancel,
    shutdown,
  };
};