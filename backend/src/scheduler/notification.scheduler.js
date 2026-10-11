/**
 * Notification scheduler.
 *
 * Periodic tasks for notification-related operations:
 * - Check expiring subscriptions
 * - Check expired subscriptions
 * - Send usage warnings (>= 80% of monthly review quota)
 * - Clean up old notifications
 *
 * Uses node-cron. Started from worker.js alongside the queue workers so a
 * single long-running process owns the schedule.
 */

import cron from 'node-cron';

import {
  notificationService,
} from '../services/notification.service.js';

import {
  notificationTriggerService,
} from '../services/notificationTrigger.service.js';

import {
  notificationConfig,
} from '../config/notification.config.js';

import {
  Subscription,
} from '../database/models/subscription.model.js';

import {
  Notification,
} from '../database/models/notification.model.js';

import {
  getWorkspaceUsage,
} from '../services/usage.service.js';

// Track running jobs to prevent overlap
const runningJobs = new Set();
const scheduledTasks = [];

const runJob = async (name, fn) => {
  if (runningJobs.has(name)) {
    console.info(`[notificationScheduler] Job ${name} already running, skipping`);
    return;
  }

  runningJobs.add(name);

  try {
    console.info(`[notificationScheduler] Starting job: ${name}`);
    await fn();
    console.info(`[notificationScheduler] Completed job: ${name}`);
  } catch (error) {
    console.error(`[notificationScheduler] Job ${name} failed:`, error.message);
  } finally {
    runningJobs.delete(name);
  }
};

/**
 * Check if a similar notification already exists (dedupe across cycles).
 */
const checkExistingNotification = async (scope, type, data) => {
  const query = {
    type,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
  };

  if (scope.companyId) {
    query.company = scope.companyId;
  } else if (scope.userId) {
    query.user = scope.userId;
  }

  for (const [key, value] of Object.entries(data || {})) {
    query[`data.${key}`] = value;
  }

  const existing = await Notification.findOne(query).lean();
  return Boolean(existing);
};

/**
 * Check for expiring subscriptions and send warnings.
 * Runs daily at 9:00 AM.
 */
const checkExpiringSubscriptions = async () => {
  const now = new Date();
  const warningThresholds = [7, 3, 1]; // Days before expiry

  for (const daysLeft of warningThresholds) {
    const startOfDay = new Date(now);
    startOfDay.setDate(startOfDay.getDate() + daysLeft);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const expiringSubs = await Subscription.find({
      expiresAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'active',
    }).lean();

    for (const sub of expiringSubs) {
      const scope = {
        companyId: sub.companyId || null,
        userId: sub.userId || null,
      };

      const alreadyNotified = await checkExistingNotification(
        scope,
        'subscription.expiring',
        { subscriptionId: sub._id.toString(), daysLeft },
      );

      if (!alreadyNotified) {
        await notificationTriggerService.onSubscriptionExpiring(sub, daysLeft);
      }
    }
  }
};

/**
 * Check for expired subscriptions.
 * Runs daily at midnight.
 */
const checkExpiredSubscriptions = async () => {
  const now = new Date();

  const expiredSubs = await Subscription.find({
    expiresAt: { $lte: now },
    status: { $in: ['active', 'trialing'] },
  }).lean();

  for (const sub of expiredSubs) {
    const scope = {
      companyId: sub.companyId || null,
      userId: sub.userId || null,
    };

    const alreadyNotified = await checkExistingNotification(
      scope,
      'subscription.expired',
      { subscriptionId: sub._id.toString() },
    );

    if (!alreadyNotified) {
      await notificationTriggerService.onSubscriptionExpired(sub);
    }
  }
};

/**
 * Check usage warnings (>= 80% threshold).
 * Runs daily at 10:00 AM.
 */
const checkUsageWarnings = async () => {
  // Only company subscriptions carry a review quota shared across a team.
  const subscriptions = await Subscription.find({
    companyId: { $ne: null },
    status: { $in: ['active', 'trialing'] },
  }).lean();

  for (const subscription of subscriptions) {
    const workspace = {
      type: 'company',
      companyId: subscription.companyId,
      userId: subscription.userId || null,
    };

    const usage = await getWorkspaceUsage(workspace, subscription);

    const limit = usage.reviews.limit;
    if (!limit || limit <= 0) {
      continue;
    }

    const percentage = (usage.reviews.used / limit) * 100;

    if (percentage >= 80) {
      const alreadyNotified = await checkExistingNotification(
        { companyId: subscription.companyId },
        'usage.warning',
        { limit },
      );

      if (!alreadyNotified) {
        await notificationTriggerService.onUsageWarning(workspace, usage);
      }
    }
  }
};

/**
 * Clean up old notifications.
 * Runs weekly on Sunday at 2:00 AM.
 */
const cleanupOldNotifications = async () => {
  await notificationService.cleanup(notificationConfig.retentionDays);
};

/**
 * Start all scheduled jobs.
 */
const startScheduler = () => {
  console.info('[notificationScheduler] Starting notification scheduler...');

  scheduledTasks.push(
    // Daily at 9:00 AM - Check expiring subscriptions
    cron.schedule('0 9 * * *', () => {
      runJob('checkExpiringSubscriptions', checkExpiringSubscriptions);
    }),

    // Daily at midnight - Check expired subscriptions
    cron.schedule('0 0 * * *', () => {
      runJob('checkExpiredSubscriptions', checkExpiredSubscriptions);
    }),

    // Daily at 10:00 AM - Check usage warnings
    cron.schedule('0 10 * * *', () => {
      runJob('checkUsageWarnings', checkUsageWarnings);
    }),

    // Weekly on Sunday at 2:00 AM - Cleanup old notifications
    cron.schedule('0 2 * * 0', () => {
      runJob('cleanupOldNotifications', cleanupOldNotifications);
    }),
  );

  console.info('[notificationScheduler] All jobs scheduled');

  return {
    jobs: scheduledTasks.length,
  };
};

/**
 * Stop all scheduled jobs.
 */
const stopScheduler = () => {
  for (const task of scheduledTasks) {
    try {
      task.stop();
    } catch {
      // Ignore stop errors.
    }
  }

  scheduledTasks.length = 0;
  runningJobs.clear();
  console.info('[notificationScheduler] Scheduler stopped');
};

export {
  startScheduler,
  stopScheduler,
};

export default {
  startScheduler,
  stopScheduler,
};
