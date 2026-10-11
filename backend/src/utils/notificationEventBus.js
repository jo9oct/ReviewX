/**
 * Notification event bus (Redis pub/sub).
 *
 * Notifications are delivered from a BullMQ worker process, but the SSE
 * connections live in the web/server process. A plain in-memory SSE manager
 * therefore cannot reach clients across process boundaries.
 *
 * This module bridges the two using Redis pub/sub:
 *   - The worker publishes `notification.created` events.
 *   - The server subscribes and forwards each event to its local SSE manager.
 *
 * Connections are created lazily so importing this module (e.g. from a test
 * or the delivery service) never opens a socket on its own.
 */

import IORedis from 'ioredis';

import queueConfig from '../config/queue.config.js';

const CHANNEL = 'reviewx:notification-events';

let publisher = null;
let subscriber = null;
let subscribed = false;

const createConnection = () =>
  new IORedis(queueConfig.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return Math.min(times * 500, 2000);
    },
  });

const ensureConnected = async (connection) => {
  if (connection.status === 'ready') {
    return;
  }
  if (connection.status === 'wait' || connection.status === 'end' || connection.status === 'close') {
    await connection.connect();
  }
};

/**
 * Publish a notification event for a user.
 *
 * Best-effort: never throws, so a Redis outage cannot break notification
 * creation/delivery (the in-app record still exists and clients poll).
 */
export const publishNotificationEvent = async (userId, event) => {
  try {
    if (!publisher) {
      publisher = createConnection();
      publisher.on('error', (error) => {
        console.error(`[notificationEventBus] publisher error: ${error.message}`);
      });
    }

    await ensureConnected(publisher);

    await publisher.publish(
      CHANNEL,
      JSON.stringify({ userId: String(userId), event }),
    );

    return true;
  } catch (error) {
    console.error(`[notificationEventBus] publish failed: ${error.message}`);
    if (publisher) {
      try {
        publisher.disconnect();
      } catch {
        // Ignore disconnect error.
      }
      publisher = null;
    }
    return false;
  }
};

/**
 * Subscribe to notification events.
 *
 * @param {(userId: string, event: object) => void} handler
 */
export const subscribeToNotificationEvents = async (handler) => {
  if (subscribed) {
    return subscriber;
  }

  const sub = createConnection();
  sub.on('error', (error) => {
    console.error(`[notificationEventBus] subscriber error: ${error.message}`);
  });

  sub.on('message', (channel, message) => {
    if (channel !== CHANNEL) return;

    try {
      const parsed = JSON.parse(message);
      if (parsed && parsed.userId && parsed.event) {
        handler(parsed.userId, parsed.event);
      }
    } catch (error) {
      console.error(`[notificationEventBus] invalid message: ${error.message}`);
    }
  });

  try {
    await ensureConnected(sub);
    await sub.subscribe(CHANNEL);
    subscriber = sub;
    subscribed = true;
    return subscriber;
  } catch (error) {
    try {
      sub.disconnect();
    } catch {
      // Ignore disconnect error.
    }
    subscriber = null;
    subscribed = false;
    throw error;
  }
};

/**
 * Close all event-bus connections.
 */
export const closeNotificationEventBus = async () => {
  subscribed = false;

  const connections = [publisher, subscriber].filter(Boolean);
  publisher = null;
  subscriber = null;

  for (const connection of connections) {
    try {
      if (connection.status === 'ready') {
        await connection.quit();
      } else {
        connection.disconnect();
      }
    } catch {
      try {
        connection.disconnect();
      } catch {
        // Ignore shutdown errors.
      }
    }
  }
};

export default {
  publishNotificationEvent,
  subscribeToNotificationEvents,
  closeNotificationEventBus,
};
