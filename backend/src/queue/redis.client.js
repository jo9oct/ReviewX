import IORedis from "ioredis";

import queueConfig from "../config/queue.config.js";

let connection;

export const getRedisConnection = () => {
  if (connection) {
    return connection;
  }

  connection = new IORedis(
    queueConfig.redisUrl,
    {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    },
  );

  return connection;
};

export const connectRedis = async () => {
  const redis =
    getRedisConnection();

  if (
    redis.status === "wait" ||
    redis.status === "end"
  ) {
    await redis.connect();
  }

  return redis;
};

export const disconnectRedis =
  async () => {
    if (!connection) {
      return;
    }

    await connection.quit();

    connection = null;
  };

export const pingRedis = async () => {
  const redis =
    await connectRedis();

  return redis.ping();
};