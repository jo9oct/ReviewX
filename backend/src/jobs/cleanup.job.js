import {
  getCleanupQueue,
} from "../queue/queue.factory.js";

import {
  JOB_NAMES,
} from "../queue/queue.constants.js";

const normalizeCleanupJobData = ({
  resourceType,
  resourceId,
}) => {
  if (
    typeof resourceType !== "string" ||
    !resourceType.trim()
  ) {
    throw new TypeError(
      "Cleanup resource type is required.",
    );
  }

  if (
    typeof resourceId !== "string" ||
    !resourceId.trim()
  ) {
    throw new TypeError(
      "Cleanup resource ID is required.",
    );
  }

  return {
    resourceType:
      resourceType.trim(),
    resourceId:
      resourceId.trim(),
  };
};

export const enqueueCleanupJob =
  async ({
    resourceType,
    resourceId,
  }) => {
    const queue =
      getCleanupQueue();

    const data =
      normalizeCleanupJobData({
        resourceType,
        resourceId,
      });

    return queue.add(
      JOB_NAMES.CLEANUP,
      data,
      {
        jobId:
          `cleanup:${data.resourceType}:` +
          `${data.resourceId}`,
      },
    );
  };

export const createCleanupProcessor =
  ({
    cleanupService,
  }) => {
    if (
      !cleanupService ||
      typeof cleanupService.cleanup !==
        "function"
    ) {
      throw new TypeError(
        "A cleanup service with cleanup is required.",
      );
    }

    return async (job) => {
      const data =
        normalizeCleanupJobData(
          job.data || {},
        );

      return cleanupService.cleanup(
        data,
      );
    };
  };