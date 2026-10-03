import mongoose from "mongoose";

import {
  databaseConfig
} from "../config/database.js";

import {
  logger
} from "../utils/logger.js";


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


  connectionPromise =
    mongoose
      .connect(
        databaseConfig.uri,
        {
          dbName:
            databaseConfig.databaseName,

          ...databaseConfig.options
        }
      )
      .then(
        (connection) => {
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
        }
      )
      .catch(
        (error) => {
          connectionPromise =
            null;


          logger.error(
            "MongoDB connection failed",
            {
              error:
                error.message
            }
          );


          throw error;
        }
      );


  return connectionPromise;
}


export async function disconnectDatabase() {
  connectionPromise =
    null;


  if (
    mongoose.connection.readyState ===
    0
  ) {
    return;
  }


  await mongoose.disconnect();


  logger.info(
    "MongoDB connection closed"
  );
}


/**
 * Executes database operations inside
 * one MongoDB transaction.
 *
 * If the callback throws an error,
 * the transaction is aborted automatically.
 */
export async function withDatabaseTransaction(
  work
) {
  if (typeof work !== "function") {
    throw new TypeError("Transaction callback must be a function.");
  }

  await connectDatabase();

  // Check if connected to a replica set or sharded cluster
  const topologyType = mongoose.connection.client?.topology?.description?.type;
  const isReplicaSetOrSharded =
    topologyType === "ReplicaSetWithPrimary" ||
    topologyType === "Sharded";

  if (!isReplicaSetOrSharded) {
    logger.warn(
      "Running against standalone MongoDB (no replica set) — bypassing transaction wrapper."
    );
    return await work(null);
  }

  let session = null;
  try {
    session = await mongoose.connection.startSession();
  } catch (err) {
    logger.warn(
      "Failed to start MongoDB session — proceeding without transaction",
      { error: err.message }
    );
    return await work(null);
  }

  try {
    return await session.withTransaction(
      () => work(session),
      {
        readPreference: "primary",
        writeConcern: {
          w: "majority"
        }
      }
    );
  } catch (err) {
    if (
      err.message &&
      err.message.includes(
        "Transaction numbers are only allowed on a replica set member or mongos"
      )
    ) {
      logger.warn(
        "MongoDB instance rejected transaction — executing without transaction."
      );
      return await work(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}

export function getDatabaseState() {
  return {
    readyState:
      mongoose.connection
        .readyState,

    connected:
      mongoose.connection
        .readyState === 1,

    database:
      mongoose.connection
        .name ||
      null,

    host:
      mongoose.connection
        .host ||
      null
  };
}