import {
  pingRedis,
} from "../queue/redis.client.js";

export const checkRedisHealth =
  async () => {
    const startedAt =
      Date.now();

    try {
      const result =
        await pingRedis();

      return {
        name: "redis",
        status:
          result === "PONG"
            ? "healthy"
            : "unhealthy",
        responseTimeMs:
          Date.now() -
          startedAt,
      };
    } catch (error) {
      return {
        name: "redis",
        status: "unhealthy",
        responseTimeMs:
          Date.now() -
          startedAt,
        error:
          error.message ||
          "Redis health check failed.",
      };
    }
  };