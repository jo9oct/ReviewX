import app from "./app.js";

import {
  env
} from "./config/env.js";

import {
  connectDatabase,
  disconnectDatabase
} from "./database/connection.js";

import {
  logger
} from "./utils/logger.js";

let server;

async function startServer() {
  try {
    await connectDatabase();

    server = app.listen(
      env.port,
      () => {
        logger.info(
          "Analysis backend server started",
          {
            port:
              env.port,

            environment:
              env.nodeEnv
          }
        );
      }
    );
  } catch (error) {
    logger.error(
      "Application startup failed",
      {
        error:
          error.message,

        stack:
          error.stack
      }
    );

    process.exit(1);
  }
}

async function shutdown(
  signal
) {
  logger.info(
    "Shutdown signal received",
    {
      signal
    }
  );

  try {
    if (server) {
      await new Promise(
        (
          resolve,
          reject
        ) => {
          server.close(
            (error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            }
          );
        }
      );

      logger.info(
        "HTTP server closed successfully"
      );
    }

    await disconnectDatabase();

    process.exit(0);
  } catch (error) {
    logger.error(
      "Graceful shutdown failed",
      {
        error:
          error.message,

        stack:
          error.stack
      }
    );

    process.exit(1);
  }
}

process.on(
  "SIGTERM",
  () =>
    shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () =>
    shutdown("SIGINT")
);

process.on(
  "uncaughtException",
  (error) => {
    logger.error(
      "Uncaught exception",
      {
        error:
          error.message,

        stack:
          error.stack
      }
    );

    process.exit(1);
  }
);

process.on(
  "unhandledRejection",
  (reason) => {
    logger.error(
      "Unhandled promise rejection",
      {
        reason:
          reason instanceof Error
            ? reason.message
            : String(reason)
      }
    );

    process.exit(1);
  }
);

startServer();