
import { env } from "../config/env.js";

const levels = Object.freeze({
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
});

function shouldLog(level) {
  const configuredLevel =
    levels[env.logLevel] ?? levels.info;

  return levels[level] <= configuredLevel;
}

function write(level, message, metadata = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
}

export const logger = Object.freeze({
  error(message, metadata) {
    write("error", message, metadata);
  },

  warn(message, metadata) {
    write("warn", message, metadata);
  },

  info(message, metadata) {
    write("info", message, metadata);
  },

  debug(message, metadata) {
    write("debug", message, metadata);
  }
});