import {
  getNotificationQueue,
} from "../queue/queue.factory.js";

import {
  JOB_NAMES,
} from "../queue/queue.constants.js";

const normalizeNotificationJobData = ({
  notificationType,
  recipient,
  payload,
}) => {
  if (
    typeof notificationType !== "string" ||
    !notificationType.trim()
  ) {
    throw new TypeError(
      "Notification type is required.",
    );
  }

  if (
    typeof recipient !== "string" ||
    !recipient.trim()
  ) {
    throw new TypeError(
      "Notification recipient is required.",
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new TypeError(
      "Notification payload must be an object.",
    );
  }

  return {
    notificationType:
      notificationType.trim(),
    recipient: recipient.trim(),
    payload,
  };
};

export const enqueueNotificationJob =
  async ({
    notificationType,
    recipient,
    payload,
  }) => {
    const queue =
      getNotificationQueue();

    const data =
      normalizeNotificationJobData({
        notificationType,
        recipient,
        payload,
      });

    return queue.add(
      JOB_NAMES.NOTIFICATION,
      data,
      {
        jobId:
          `notification:${data.notificationType}:` +
          `${data.recipient}`,
      },
    );
  };

export const createNotificationProcessor =
  ({
    notificationService,
  }) => {
    if (
      !notificationService ||
      typeof notificationService.send !==
        "function"
    ) {
      throw new TypeError(
        "A notification service with send is required.",
      );
    }

    return async (job) => {
      const data =
        normalizeNotificationJobData(
          job.data || {},
        );

      return notificationService.send(
        data,
      );
    };
  };