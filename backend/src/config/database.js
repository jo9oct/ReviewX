
import { env } from "./env.js";

export const databaseConfig = Object.freeze({
  uri: env.mongodb.uri,
  databaseName: env.mongodb.databaseName,

  options: {
    autoIndex: env.nodeEnv !== "production",
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2
  }
});