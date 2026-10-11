// STATUS: UPDATED

import {
  getNotificationQueue,
} from '../queue/queue.factory.js';

import {
  JOB_NAMES,
} from '../queue/queue.constants.js';

const normalizeNotificationJobData = ({
  notificationId,
}) => {
  if (
    typeof notificationId !== 'string' ||
    !notificationId.trim()
  ) {
    throw new TypeError(
      'Notification ID is required.',
    );
  }

  return {
    notificationId:
      notificationId.trim(),
  };
};

/**
 * Enqueue a notification delivery job.
 */
export const enqueueNotificationJob =
  async ({
    notificationId,
  }) => {
    const data =
      normalizeNotificationJobData({
        notificationId,
      });

    const queue =
      getNotificationQueue();

    return queue.add(
      JOB_NAMES.NOTIFICATION,
      data,
      {
        jobId:
          `notification-${data.notificationId}`,
      },
    );
  };

/**
 * Create the notification queue processor.
 *
 * Consistent with report.job.js / cleanup.job.js — the Worker itself is
 * created and managed centrally in worker.js.
 */
export const createNotificationProcessor =
  ({
    notificationDeliveryService,
  }) => {
    if (
      !notificationDeliveryService ||
      typeof notificationDeliveryService.process !==
        'function'
    ) {
      throw new TypeError(
        'A notification delivery service with process is required.',
      );
    }

    return async (job) => {
      const data =
        normalizeNotificationJobData(
          job.data || {},
        );

      return notificationDeliveryService.process(
        data.notificationId,
      );
    };
  };
