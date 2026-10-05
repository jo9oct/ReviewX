import {
  Queue,
} from "bullmq";

import queueConfig from "../config/queue.config.js";
import {
  QUEUE_DEFAULT_OPTIONS,
} from "./queue.constants.js";
import {
  getRedisConnection,
} from "./redis.client.js";

const queues = new Map();

const createQueue = (
  name,
) => {
  if (queues.has(name)) {
    return queues.get(name);
  }

  const queue = new Queue(name, {
    connection:
      getRedisConnection(),
    defaultJobOptions:
      QUEUE_DEFAULT_OPTIONS,
  });

  queues.set(name, queue);

  return queue;
};

export const getQueue = (
  queueName,
) => {
  if (
    typeof queueName !== "string" ||
    !queueName.trim()
  ) {
    throw new TypeError(
      "Queue name is required.",
    );
  }

  return createQueue(
    queueName.trim(),
  );
};

export const getReviewQueue = () =>
  getQueue(
    queueConfig.queues.review,
  );

export const getReportQueue = () =>
  getQueue(
    queueConfig.queues.report,
  );

export const getCleanupQueue = () =>
  getQueue(
    queueConfig.queues.cleanup,
  );

export const getNotificationQueue = () =>
  getQueue(
    queueConfig.queues.notification,
  );

export const closeQueues = async () => {
  const closeOperations =
    [...queues.values()].map(
      (queue) => queue.close(),
    );

  await Promise.all(closeOperations);

  queues.clear();
};