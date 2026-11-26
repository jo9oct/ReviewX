import dns from 'node:dns';
import mongoose from 'mongoose';
import environment from '../config/environment.js';
import { logger } from '../utils/logger.js';

let connectionPromise = null;
let dnsFallbackAttempted = false;

/**
 * Mask credentials in MongoDB URI for safe logging.
 */
const maskUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/(.*?)@/, (_, userinfo) => {
    const parts = userinfo.split(':');
    const user = parts[0] ? `${parts[0].slice(0, 3)}***` : '***';
    return `//${user}:******@`;
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const applyDnsFallback = () => {
  if (dnsFallbackAttempted) return;
  try {
    const configuredServers = process.env.DNS_SERVERS
      ? process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)
      : ['1.1.1.1', '8.8.8.8', '1.0.0.1', '8.8.4.4'];

    if (configuredServers.length > 0) {
      dns.setServers(configuredServers);
      dnsFallbackAttempted = true;
      if (logger && typeof logger.info === 'function') {
        logger.info('Applied DNS fallback servers for SRV resolution', {
          servers: configuredServers,
        });
      }
    }
  } catch (dnsErr) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn('Failed to configure fallback DNS servers', {
        error: dnsErr.message,
      });
    }
  }
};

const attemptMongooseConnect = async (retries = 5, initialDelay = 2000) => {
  let attempt = 0;
  let delay = initialDelay;
  const timeoutMs =
    environment.database.serverSelectionTimeoutMS ||
    environment.database.serverSelectionTimeoutMs ||
    10000;

  while (attempt <= retries) {
    try {
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
      }

      const connection = await mongoose.connect(environment.database.uri, {
        serverSelectionTimeoutMS: timeoutMs,
        maxPoolSize: environment.database.maxPoolSize,
        minPoolSize: environment.database.minPoolSize,
        autoIndex: environment.database.autoIndex,
      });

      if (logger && typeof logger.info === 'function') {
        logger.info('MongoDB connection established', {
          database: connection.connection.name,
          host: connection.connection.host,
        });
      }

      return mongoose.connection;
    } catch (error) {
      attempt++;
      const isDnsError =
        error.message?.includes('querySrv') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEOUT';

      if (isDnsError && !dnsFallbackAttempted) {
        applyDnsFallback();
      }

      if (attempt > retries) {
        if (logger && typeof logger.error === 'function') {
          logger.error('MongoDB connection failed after all retries', {
            error: error.message,
            uri: maskUri(environment.database.uri),
            attempts: attempt,
          });
        }
        throw error;
      }

      if (logger && typeof logger.warn === 'function') {
        logger.warn(
          `MongoDB connection attempt ${attempt}/${retries} failed. Retrying in ${delay}ms...`,
          {
            error: error.message,
            nextRetryDelayMs: delay,
          },
        );
      } else {
        process.stderr.write(
          `[database] Connection attempt ${attempt}/${retries} failed (${error.message}). Retrying in ${delay}ms...\n`,
        );
      }

      await wait(delay);
      delay = Math.min(Math.round(delay * 1.5), 10000);
    }
  }
};

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = attemptMongooseConnect().catch((error) => {
    connectionPromise = null;
    throw error;
  });

  return connectionPromise;
};

mongoose.connection.on('disconnected', () => {
  if (logger && typeof logger.warn === 'function') {
    logger.warn('MongoDB disconnected');
  }
});

mongoose.connection.on('error', (err) => {
  if (logger && typeof logger.error === 'function') {
    logger.error('MongoDB connection error', { error: err.message });
  }
});

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
