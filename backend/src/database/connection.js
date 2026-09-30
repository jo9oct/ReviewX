import mongoose from 'mongoose';

import environment from '../config/environment.js';

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
    await connectionPromise;
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
};

const disconnectDatabase = async () => {
  connectionPromise = null;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
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
  getDatabaseState
};