
import mongoose from "mongoose";

import { databaseConfig } from "../config/database.js";
import { logger } from "../utils/logger.js";

let connectionPromise = null;

export async function connectDatabase() {
  if (!databaseConfig.uri) {
    throw new Error(
      "MONGODB_URI is not configured."
    );
  }

  if (
    mongoose.connection.readyState === 1 ||
    mongoose.connection.readyState === 2
  ) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(
      databaseConfig.uri,
      {
        dbName: databaseConfig.databaseName,
        ...databaseConfig.options
      }
    )
    .then((connection) => {
      logger.info(
        "MongoDB connection established",
        {
          database:
            connection.connection.name,
          host:
            connection.connection.host
        }
      );

      return connection;
    })
    .catch((error) => {
      connectionPromise = null;

      logger.error(
        "MongoDB connection failed",
        {
          error: error.message
        }
      );

      throw error;
    });

  return connectionPromise;
}

export async function disconnectDatabase() {
  connectionPromise = null;

  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();

  logger.info(
    "MongoDB connection closed"
  );
}

export function getDatabaseState() {
  return {
    readyState:
      mongoose.connection.readyState,
    connected:
      mongoose.connection.readyState === 1,
    database:
      mongoose.connection.name || null,
    host:
      mongoose.connection.host || null
  };
}