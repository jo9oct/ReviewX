import {
  checkDatabaseHealth,
} from "./database.health.js";

import {
  checkRedisHealth,
} from "./redis.health.js";

import {
  checkAnalyzerHealth,
} from "./analyzer.health.js";

const getOverallStatus = (
  checks,
) => {
  const values =
    Object.values(checks);

  if (
    values.some(
      (check) =>
        check.status ===
        "unhealthy",
    )
  ) {
    return "unhealthy";
  }

  if (
    values.some(
      (check) =>
        check.status ===
        "degraded",
    )
  ) {
    return "degraded";
  }

  return "healthy";
};

export const getHealthStatus =
  async () => {
    const [
      database,
      redis,
      analyzer,
    ] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      Promise.resolve(
        checkAnalyzerHealth(),
      ),
    ]);

    const checks = {
      database,
      redis,
      analyzer,
    };

    return {
      status:
        getOverallStatus(checks),

      application: {
        status: "healthy",
        uptimeSeconds:
          Math.floor(
            process.uptime(),
          ),
        nodeVersion:
          process.version,
      },

      checks,

      timestamp:
        new Date().toISOString(),
    };
  };