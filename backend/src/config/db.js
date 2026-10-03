/**
 * Database connection adapter — standardizes on src/database/connection.js.
 */
import {
  connectDatabase,
  disconnectDatabase,
  withDatabaseTransaction,
  getDatabaseState
} from '../database/connection.js';

export const connectDB = connectDatabase;
export {
  connectDatabase,
  disconnectDatabase,
  withDatabaseTransaction,
  getDatabaseState
};
export default {
  connectDB,
  connectDatabase,
  disconnectDatabase,
  withDatabaseTransaction,
  getDatabaseState
};
