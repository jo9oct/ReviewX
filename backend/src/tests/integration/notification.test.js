/**
 * Notification System Integration Tests
 *
 * Tests the complete notification pipeline:
 * - Creating notifications
 * - Querying notifications
 * - Marking as read
 * - Deleting notifications
 * - Preferences management
 * - Delivery service
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  Notification,
} from '../../database/models/notification.model.js';

import {
  NotificationPreference,
} from '../../database/models/notificationPreference.model.js';

import {
  User,
} from '../../database/models/user.model.js';

import {
  Company,
} from '../../database/models/company.model.js';

import {
  notificationService,
} from '../../services/notification.service.js';

import {
  notificationTriggerService,
} from '../../services/notificationTrigger.service.js';

import {
  notificationConfig,
  NOTIFICATION_TYPES,
  DELIVERY_CHANNELS,
  PRIORITY_LEVELS,
} from '../../config/notification.config.js';

import { closeQueues } from '../../queue/queue.factory.js';
import { disconnectRedis } from '../../queue/redis.client.js';
import { closeNotificationEventBus } from '../../utils/notificationEventBus.js';

describe('Notification System Integration Tests', () => {
  let testUserId;
  let testCompanyId;
  let adminUserId;
  let inviteeId;
  let inviteeEmail;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/reviewx');
    }
    // Create test IDs
    testUserId = new mongoose.Types.ObjectId();
    testCompanyId = new mongoose.Types.ObjectId();

    // Create a real company + company_admin so the company-broadcast path can
    // be verified end-to-end (the role must be `company_admin`, not `admin`).
    const adminId = new mongoose.Types.ObjectId();
    const company = await Company.create({
      _id: testCompanyId,
      name: 'Notification Test Co',
      slug: `notification-test-${Date.now()}`,
      owner: adminId,
    });
    await User.create({
      _id: adminId,
      name: 'Notification Admin',
      email: `notif-admin-${Date.now()}@example.com`,
      passwordHash: 'x',
      role: 'company_admin',
      company: company._id,
      isActive: true,
    });
    adminUserId = adminId;

    // An existing user whose email matches an incoming invitation.
    inviteeId = new mongoose.Types.ObjectId();
    inviteeEmail = `notif-invitee-${Date.now()}@example.com`;
    await User.create({
      _id: inviteeId,
      name: 'Notification Invitee',
      email: inviteeEmail,
      passwordHash: 'x',
      role: 'member',
      company: null,
      isActive: true,
    });
  });

  after(async () => {
    // Cleanup
    await Notification.deleteMany({ user: testUserId });
    await Notification.deleteMany({ user: adminUserId });
    await Notification.deleteMany({ user: inviteeId });
    await NotificationPreference.deleteMany({ user: testUserId });
    await User.deleteOne({ _id: adminUserId });
    await User.deleteOne({ _id: inviteeId });
    await Company.deleteOne({ _id: testCompanyId });
    await closeNotificationEventBus().catch(() => {});
    await closeQueues().catch(() => {});
    await disconnectRedis().catch(() => {});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('Configuration loads correctly', () => {
    assert.ok(notificationConfig);
    assert.ok(NOTIFICATION_TYPES);
    assert.ok(DELIVERY_CHANNELS);
    assert.ok(PRIORITY_LEVELS);
    assert.equal(Object.keys(NOTIFICATION_TYPES).length, 23);
    assert.equal(Object.keys(DELIVERY_CHANNELS).length, 3);
    assert.equal(Object.keys(PRIORITY_LEVELS).length, 4);
  });

  test('Creates a notification for a user', async () => {
    const notification = await notificationService.create({
      userId: testUserId,
      type: NOTIFICATION_TYPES.REVIEW_COMPLETED,
      title: 'Test Review Completed',
      message: 'Your review has been completed successfully.',
      data: {
        reviewId: 'test-review-123',
        totalFindings: 5,
        score: 85,
      },
      actionUrl: '/reviews/test-review-123',
      actionLabel: 'View Results',
    });

    assert.ok(notification);
    assert.ok(notification._id);
    assert.equal(notification.user.toString(), testUserId.toString());
    assert.equal(notification.type, NOTIFICATION_TYPES.REVIEW_COMPLETED);
    assert.equal(notification.title, 'Test Review Completed');
    assert.equal(notification.read, false);
    assert.ok(notification.channels.includes(DELIVERY_CHANNELS.IN_APP));
  });

  test('Validates required fields', async () => {
    await assert.rejects(
      notificationService.create({
        type: NOTIFICATION_TYPES.REVIEW_COMPLETED,
        title: 'Test',
        message: 'Test',
      }),
      /valid user ID/i,
    );

    await assert.rejects(
      notificationService.create({
        userId: testUserId,
        title: 'Test',
        message: 'Test',
      }),
      /valid notification type/i,
    );

    await assert.rejects(
      notificationService.create({
        userId: testUserId,
        type: NOTIFICATION_TYPES.REVIEW_COMPLETED,
      }),
      /title and message are required/i,
    );
  });

  test('Queries notifications for a user', async () => {
    // Create multiple notifications
    await notificationService.create({
      userId: testUserId,
      type: NOTIFICATION_TYPES.REVIEW_QUEUED,
      title: 'Review Queued',
      message: 'Your review has been queued.',
    });

    await notificationService.create({
      userId: testUserId,
      type: NOTIFICATION_TYPES.CRITICAL_FINDING,
      title: 'Critical Finding',
      message: 'A critical finding was detected.',
      priority: PRIORITY_LEVELS.CRITICAL,
    });

    const notifications = await notificationService.getForUser(testUserId, {
      limit: 10,
    });

    assert.ok(Array.isArray(notifications));
    assert.ok(notifications.length >= 3);

    // Check unread only
    const unread = await notificationService.getForUser(testUserId, {
      unreadOnly: true,
    });

    assert.ok(unread.every((n) => !n.read));

    // Check by type
    const critical = await notificationService.getForUser(testUserId, {
      type: NOTIFICATION_TYPES.CRITICAL_FINDING,
    });

    assert.ok(critical.every((n) => n.type === NOTIFICATION_TYPES.CRITICAL_FINDING));
  });

  test('Marks notification as read', async () => {
    const notification = await notificationService.create({
      userId: testUserId,
      type: NOTIFICATION_TYPES.REVIEW_STARTED,
      title: 'Review Started',
      message: 'Your review has started processing.',
    });

    assert.equal(notification.read, false);

    const updated = await notificationService.markAsRead(notification._id, testUserId);

    assert.ok(updated);
    assert.equal(updated.read, true);
    assert.ok(updated.readAt);
  });

  test('Marks all notifications as read', async () => {
    const result = await notificationService.markAllAsRead(testUserId);

    assert.ok(result);
    assert.ok(result.modifiedCount >= 0);

    const unread = await notificationService.getForUser(testUserId, {
      unreadOnly: true,
    });

    assert.equal(unread.length, 0);
  });

  test('Deletes a notification', async () => {
    const notification = await notificationService.create({
      userId: testUserId,
      type: NOTIFICATION_TYPES.REPORT_READY,
      title: 'Report Ready',
      message: 'Your report is ready.',
    });

    await notificationService.delete(notification._id, testUserId);

    await assert.rejects(
      notificationService.getById(notification._id, testUserId),
      /not found/i,
    );
  });

  test('Gets unread count', async () => {
    // Create some unread notifications
    await notificationService.create({
      userId: testUserId,
      type: NOTIFICATION_TYPES.REVIEW_QUEUED,
      title: 'Test 1',
      message: 'Test message 1',
    });

    await notificationService.create({
      userId: testUserId,
      type: NOTIFICATION_TYPES.REVIEW_QUEUED,
      title: 'Test 2',
      message: 'Test message 2',
    });

    const count = await notificationService.getUnreadCount(testUserId);

    assert.ok(count >= 2);
  });

  test('Creates notification for company admins', async () => {
    const notifications = await notificationService.createForCompany({
      companyId: testCompanyId,
      type: NOTIFICATION_TYPES.MEMBER_JOINED,
      title: 'New Member Joined',
      message: 'A new member joined the team.',
    });

    // A real company_admin exists for this company, so exactly one
    // notification must be created and delivered to that admin.
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].user.toString(), adminUserId.toString());
    assert.equal(notifications[0].type, NOTIFICATION_TYPES.MEMBER_JOINED);

    // And it must be retrievable through the admin's inbox.
    const adminInbox = await notificationService.getForUser(adminUserId, {
      limit: 10,
    });

    assert.ok(
      adminInbox.some((n) => n.type === NOTIFICATION_TYPES.MEMBER_JOINED),
    );
  });

  test('Invitation trigger notifies an existing user by email (plain object input)', async () => {
    // The invitation service fires this trigger with a plain object (not a
    // Mongoose document) and previously passed the email as the user id,
    // which always failed. It must now resolve the existing user by email.
    await notificationTriggerService.onInvitationCreated(
      {
        _id: new mongoose.Types.ObjectId(),
        email: inviteeEmail,
        company: testCompanyId,
        companyName: 'Notification Test Co',
        role: 'member',
      },
      { name: 'Notification Admin' },
    );

    const inbox = await notificationService.getForUser(inviteeId, {
      limit: 10,
    });

    assert.ok(
      inbox.some((n) => n.type === NOTIFICATION_TYPES.INVITATION_RECEIVED),
    );
  });

  test('Manages notification preferences', async () => {
    const prefs = await notificationService.getPreferences(testUserId);

    assert.ok(prefs);
    assert.equal(prefs.user.toString(), testUserId.toString());
    assert.ok(prefs.types.length > 0);
    assert.ok(prefs.quietHours);
    assert.ok(prefs.digest);

    // Update preferences
    const updated = await notificationService.updatePreferences(testUserId, {
      emailEnabled: false,
      quietHours: {
        enabled: true,
        start: '23:00',
        end: '07:00',
        timezone: 'America/New_York',
      },
    });

    assert.equal(updated.emailEnabled, false);
    assert.equal(updated.quietHours.enabled, true);
    assert.equal(updated.quietHours.start, '23:00');
  });

  test('Updates type-specific preferences', async () => {
    const updated = await notificationService.updateTypePreference(
      testUserId,
      NOTIFICATION_TYPES.REVIEW_COMPLETED,
      { email: false, inApp: true },
    );

    const typePref = updated.types.find(
      (t) => t.type === NOTIFICATION_TYPES.REVIEW_COMPLETED,
    );

    assert.ok(typePref);
    assert.equal(typePref.email, false);
    assert.equal(typePref.inApp, true);
  });

  test('Enforces access control on notifications', async () => {
    const notification = await notificationService.create({
      userId: testUserId,
      type: NOTIFICATION_TYPES.REVIEW_COMPLETED,
      title: 'Access Test',
      message: 'Testing access control.',
    });

    const otherUserId = new mongoose.Types.ObjectId();

    await assert.rejects(
      notificationService.getById(notification._id, otherUserId),
      /access/i,
    );

    await assert.rejects(
      notificationService.markAsRead(notification._id, otherUserId),
      /not found/i,
    );
  });

  test('Rate limiting prevents notification spam', async () => {
    // Create many notifications quickly
    const promises = [];

    for (let i = 0; i < 60; i++) {
      promises.push(
        notificationService.create({
          userId: testUserId,
          type: NOTIFICATION_TYPES.REVIEW_QUEUED,
          title: `Rate Limit Test ${i}`,
          message: 'Testing rate limiting.',
        }),
      );
    }

    const results = await Promise.all(promises);

    // Some should be null due to rate limiting
    const successful = results.filter(Boolean);
    const blocked = results.filter((r) => r === null);

    assert.ok(successful.length > 0);
    assert.ok(blocked.length > 0, 'Rate limiting should block some requests');
  });

  test('Notification model has correct indexes', () => {
    const indexes = Notification.schema.indexes();

    // Check that key indexes exist
    const indexKeys = indexes.map((idx) => Object.keys(idx[0]));

    assert.ok(indexKeys.some((keys) => keys.includes('user')));
    assert.ok(indexKeys.some((keys) => keys.includes('createdAt')));
    assert.ok(indexKeys.some((keys) => keys.includes('company')));
    assert.ok(indexKeys.some((keys) => keys.includes('type')));
  });

  test('Preference model has correct defaults', async () => {
    const newUserId = new mongoose.Types.ObjectId();
    const prefs = await notificationService.getPreferences(newUserId);

    assert.equal(prefs.emailEnabled, true);
    assert.equal(prefs.inAppEnabled, true);
    assert.equal(prefs.quietHours.enabled, false);
    assert.equal(prefs.digest.enabled, false);
    assert.equal(prefs.digest.frequency, 'daily');

    // Cleanup
    await NotificationPreference.deleteOne({ user: newUserId });
  });
});
