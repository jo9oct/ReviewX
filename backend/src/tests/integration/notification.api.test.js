/**
 * Notification API (HTTP) integration tests.
 *
 * Exercises the real Express app over HTTP to prove:
 * - Static routes (`/preferences`, `/stream`, `/unread-count`) are not
 *   shadowed by the `/:id` route.
 * - The SSE stream authenticates via a `?token=` query param.
 * - The core notification CRUD endpoints work end-to-end.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import app from '../../app.js';
import { config } from '../../config/env.js';

import { User } from '../../database/models/user.model.js';
import { Notification } from '../../database/models/notification.model.js';

import { notificationService } from '../../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../config/notification.config.js';

import { closeQueues } from '../../queue/queue.factory.js';
import { disconnectRedis } from '../../queue/redis.client.js';

import {
  publishNotificationEvent,
  subscribeToNotificationEvents,
  closeNotificationEventBus,
} from '../../utils/notificationEventBus.js';

async function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('Notification HTTP API', { timeout: 60000 }, async (t) => {
  const server = await startTestServer();
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongoUri);
  }

  const email = `notif-http-${Date.now()}@example.com`;
  const user = await User.create({
    name: 'Notif HTTP User',
    email,
    passwordHash: 'x',
    role: 'member',
    company: null,
    isActive: true,
  });

  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    config.jwtSecret,
    { expiresIn: '1h' },
  );

  const authHeaders = { Authorization: `Bearer ${token}` };

  t.after(async () => {
    await Notification.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await closeNotificationEventBus().catch(() => {});
    await closeQueues().catch(() => {});
    await disconnectRedis().catch(() => {});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  await t.test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${base}/notifications`);
    assert.equal(res.status, 401);
  });

  await t.test('lists notifications for the user', async () => {
    await notificationService.create({
      userId: user._id,
      type: NOTIFICATION_TYPES.REVIEW_COMPLETED,
      title: 'HTTP List Test',
      message: 'Created via the service for the HTTP test.',
    });

    const res = await fetch(`${base}/notifications`, { headers: authHeaders });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.notifications));
    assert.ok(body.data.notifications.length >= 1);
  });

  await t.test('returns unread count', async () => {
    const res = await fetch(`${base}/notifications/unread-count`, {
      headers: authHeaders,
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.count >= 1);
  });

  await t.test('GET /preferences is not shadowed by /:id', async () => {
    const res = await fetch(`${base}/notifications/preferences`, {
      headers: authHeaders,
    });

    // If the route were shadowed by `/:id`, this would be a 400/404 instead.
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.preferences);
    assert.equal(body.data.preferences.user.toString(), user._id.toString());
  });

  await t.test('PATCH /preferences updates preferences', async () => {
    const res = await fetch(`${base}/notifications/preferences`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inAppEnabled: false }),
    });

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.preferences.inAppEnabled, false);
  });

  await t.test('marks a notification as read', async () => {
    const created = await notificationService.create({
      userId: user._id,
      type: NOTIFICATION_TYPES.REPORT_READY,
      title: 'HTTP Read Test',
      message: 'Mark me read.',
    });

    const res = await fetch(
      `${base}/notifications/${created._id}/read`,
      { method: 'PATCH', headers: authHeaders },
    );

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.notification.read, true);
  });

  await t.test('SSE stream authenticates with a query token', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(
        `${base}/notifications/stream?token=${encodeURIComponent(token)}`,
        { signal: controller.signal },
      );

      // If the global authenticate ran before the query-token middleware (or
      // the route were shadowed by /:id), this would be 401/400.
      assert.equal(res.status, 200);
      assert.match(
        res.headers.get('content-type') || '',
        /text\/event-stream/,
      );

      const reader = res.body.getReader();
      const { value } = await reader.read();
      const firstChunk = new TextDecoder().decode(value);

      assert.match(firstChunk, /connected/);
      await reader.cancel();
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  });

  await t.test('event bus bridges worker events to the server', async () => {
    const userId = user._id.toString();
    const received = new Promise((resolve) => {
      subscribeToNotificationEvents((eventUserId, event) => {
        if (eventUserId === userId) {
          resolve(event);
        }
      });
    });

    const published = await publishNotificationEvent(userId, {
      type: 'notification.created',
      data: { title: 'Bridge Test' },
    });

    assert.equal(published, true);

    const event = await Promise.race([
      received,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('event not received')), 5000),
      ),
    ]);

    assert.equal(event.type, 'notification.created');
    assert.equal(event.data.title, 'Bridge Test');
  });
});
