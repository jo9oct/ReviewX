import mongoose from 'mongoose';
import environment from '../config/environment.js';
import { logger } from '../utils/logger.js';

let connectionPromise = null;

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose.connect(environment.database.uri, {
    serverSelectionTimeoutMS: environment.database.serverSelectionTimeoutMs,
    maxPoolSize: environment.database.maxPoolSize,
    minPoolSize: environment.database.minPoolSize,
    autoIndex: environment.database.autoIndex
  });

  try {
    const connection = await connectionPromise;
    if (logger && typeof logger.info === 'function') {
      logger.info('MongoDB connection established', {
        database: connection.connection.name,
        host: connection.connection.host
      });
    }
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    if (logger && typeof logger.error === 'function') {
      logger.error('MongoDB connection failed', {
        error: error.message
      });
    }
    throw error;
  }
};

const disconnectDatabase = async () => {
  connectionPromise = null;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    if (logger && typeof logger.info === 'function') {
      logger.info('MongoDB connection closed');
    }
  }
};

/**
 * Executes database operations inside one MongoDB transaction.
 * If the callback throws an error, the transaction is aborted automatically.
 * Supports fallback for standalone MongoDB instances without replica sets.
 */
const withDatabaseTransaction = async (work) => {
  if (typeof work !== 'function') {
    throw new TypeError('Transaction callback must be a function.');
  }

  await connectDatabase();

  const topologyType = mongoose.connection.client?.topology?.description?.type;
  const isReplicaSetOrSharded =
    topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

  if (!isReplicaSetOrSharded) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(
        'Running against standalone MongoDB (no replica set) — bypassing transaction wrapper.'
      );
    }
    return await work(null);
  }

  let session = null;
  try {
    session = await mongoose.connection.startSession();
  } catch (err) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(
        'Failed to start MongoDB session — proceeding without transaction',
        { error: err.message }
      );
    }
    return await work(null);
  }

  try {
    return await session.withTransaction(
      () => work(session),
      {
        readPreference: 'primary',
        writeConcern: {
          w: 'majority'
        }
      }
    );
  } catch (err) {
    if (
      err.message &&
      err.message.includes(
        'Transaction numbers are only allowed on a replica set member or mongos'
      )
    ) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn(
          'MongoDB instance rejected transaction — executing without transaction.'
        );
      }
      return await work(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
};

const getDatabaseState = () => {
  return {
    readyState: mongoose.connection.readyState,
    connected: mongoose.connection.readyState === 1,
    name: mongoose.connection.name || null,
    host: mongoose.connection.host || null
  };
};

export {
  connectDatabase,
  disconnectDatabase,
  withDatabaseTransaction,
  getDatabaseState
};

export default {
  connectDatabase,
  disconnectDatabase,
  withDatabaseTransaction,
  getDatabaseState
};