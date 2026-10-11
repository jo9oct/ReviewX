/**
 * Notification service.
 *
 * Core service for creating, querying, and managing notifications.
 * Handles user notifications, company-wide notifications, and platform admin alerts.
 */

import mongoose from 'mongoose';

import {
  notificationConfig,
  NOTIFICATION_TYPES,
  DELIVERY_CHANNELS,
  PRIORITY_LEVELS,
  DEFAULT_CHANNELS,
  DEFAULT_PRIORITY,
} from '../config/notification.config.js';

import {
  notificationRepository,
} from '../database/repositories/notification.repository.js';

import {
  notificationPreferenceRepository,
} from '../database/repositories/notificationPreference.repository.js';

import {
  AppError,
} from '../utils/errors.js';

import {
  enqueueNotificationJob,
} from '../jobs/notification.job.js';

// Rate limiting cache (in-memory, resets on restart)
const rateLimitCache = new Map();

const checkRateLimit = (userId, maxPerHour) => {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000; // 1 hour window

  if (!rateLimitCache.has(userId)) {
    rateLimitCache.set(userId, []);
  }

  const timestamps = rateLimitCache.get(userId).filter((t) => t > windowStart);

  if (timestamps.length >= maxPerHour) {
    return false;
  }

  timestamps.push(now);
  rateLimitCache.set(userId, timestamps);
  return true;
};

const getChannelsForUser = (type, preferences) => {
  const defaults = DEFAULT_CHANNELS[type] || [DELIVERY_CHANNELS.IN_APP];

  if (!preferences) {
    return defaults;
  }

  const typePref = preferences.getChannelPreference(type);

  const channels = [];

  if (typePref.inApp && preferences.inAppEnabled !== false) {
    channels.push(DELIVERY_CHANNELS.IN_APP);
  }

  if (typePref.email && preferences.emailEnabled !== false) {
    channels.push(DELIVERY_CHANNELS.EMAIL);
  }

  return channels.length > 0 ? channels : [DELIVERY_CHANNELS.IN_APP];
};

const buildNotificationDocument = ({
  user,
  company = null,
  type,
  title,
  message,
  data = {},
  priority = null,
  channels = null,
  actionUrl = null,
  actionLabel = null,
}) => ({
  user,
  company,
  type,
  title,
  message,
  data,
  priority: priority ?? DEFAULT_PRIORITY[type] ?? PRIORITY_LEVELS.NORMAL,
  channels: channels || DEFAULT_CHANNELS[type] || [DELIVERY_CHANNELS.IN_APP],
  actionUrl,
  actionLabel,
});

const dispatchDelivery = async (notificationId) => {
  try {
    await enqueueNotificationJob({
      notificationId: notificationId.toString(),
    });
  } catch (error) {
    console.error(`[notification] Failed to enqueue delivery job: ${error.message}`);
  }
};

const notificationService = {
  /**
   * Create a single notification for a user.
   */
  async create({
    userId,
    companyId = null,
    type,
    title,
    message,
    data = {},
    priority = null,
    channels = null,
    actionUrl = null,
    actionLabel = null,
  }) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError({
        code: 'NOTIFICATION_USER_REQUIRED',
        message: 'A valid user ID is required to create a notification.',
        statusCode: 400,
      });
    }

    if (!type || !Object.values(NOTIFICATION_TYPES).includes(type)) {
      throw new AppError({
        code: 'NOTIFICATION_TYPE_INVALID',
        message: 'A valid notification type is required.',
        statusCode: 400,
      });
    }

    if (!title || !message) {
      throw new AppError({
        code: 'NOTIFICATION_CONTENT_REQUIRED',
        message: 'Notification title and message are required.',
        statusCode: 400,
      });
    }

    // Rate limiting
    if (!checkRateLimit(userId, notificationConfig.maxNotificationsPerHour)) {
      console.warn(`[notification] Rate limit exceeded for user ${userId}`);
      return null;
    }

    // Get user preferences
    const preferences = await notificationPreferenceRepository.getOrCreate(userId);

    // Determine channels based on preferences
    const resolvedChannels = getChannelsForUser(type, preferences);

    // Override with explicitly provided channels if any
    const finalChannels = channels || resolvedChannels;

    const document = buildNotificationDocument({
      user: userId,
      company: companyId,
      type,
      title,
      message,
      data,
      priority,
      channels: finalChannels,
      actionUrl,
      actionLabel,
    });

    const notification = await notificationRepository.create(document);

    // Enqueue delivery
    await dispatchDelivery(notification._id);

    return notification;
  },

  /**
   * Create notifications for multiple users (e.g., company admins).
   */
  async createForCompany({
    companyId,
    type,
    title,
    message,
    data = {},
    priority = null,
    roles = ['company_admin'],
    channels = null,
    actionUrl = null,
    actionLabel = null,
  }) {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      throw new AppError({
        code: 'NOTIFICATION_COMPANY_REQUIRED',
        message: 'A valid company ID is required.',
        statusCode: 400,
      });
    }

    // Find users with specified roles in this company
    const { User } = await import('../database/models/user.model.js');

    const users = await User.find({
      company: companyId,
      role: { $in: roles },
      isActive: true,
    }).select('_id');

    if (users.length === 0) {
      return [];
    }

    const notifications = await Promise.all(
      users.map((user) =>
        this.create({
          userId: user._id,
          companyId,
          type,
          title,
          message,
          data,
          priority,
          channels,
          actionUrl,
          actionLabel,
        }),
      ),
    );

    return notifications.filter(Boolean);
  },

  /**
   * Create notifications for all platform admins.
   */
  async createForPlatformAdmins({
    type,
    title,
    message,
    data = {},
    priority = null,
    channels = null,
    actionUrl = null,
    actionLabel = null,
  }) {
    const { User } = await import('../database/models/user.model.js');

    const admins = await User.find({
      role: 'platform_admin',
      isActive: true,
    }).select('_id');

    if (admins.length === 0) {
      return [];
    }

    const notifications = await Promise.all(
      admins.map((admin) =>
        this.create({
          userId: admin._id,
          type,
          title,
          message,
          data,
          priority,
          channels,
          actionUrl,
          actionLabel,
        }),
      ),
    );

    return notifications.filter(Boolean);
  },

  /**
   * Get notifications for a user with pagination.
   */
  async getForUser(userId, { unreadOnly = false, type = null, limit = 20, offset = 0 } = {}) {
    return notificationRepository.findForUser(userId, { unreadOnly, type, limit, offset });
  },

  /**
   * Get a single notification by ID (with ownership check).
   */
  async getById(notificationId, userId) {
    const notification = await notificationRepository.findById(notificationId);

    if (!notification) {
      throw new AppError({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found.',
        statusCode: 404,
      });
    }

    if (notification.user.toString() !== userId.toString()) {
      throw new AppError({
        code: 'NOTIFICATION_ACCESS_DENIED',
        message: 'You do not have access to this notification.',
        statusCode: 403,
      });
    }

    return notification;
  },

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId, userId) {
    const notification = await notificationRepository.markAsRead(notificationId, userId);

    if (!notification) {
      throw new AppError({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found.',
        statusCode: 404,
      });
    }

    return notification;
  },

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  },

  /**
   * Soft-delete a notification.
   */
  async delete(notificationId, userId) {
    const notification = await notificationRepository.softDelete(notificationId, userId);

    if (!notification) {
      throw new AppError({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found.',
        statusCode: 404,
      });
    }

    return notification;
  },

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(userId) {
    return notificationRepository.getUnreadCount(userId);
  },

  /**
   * Get notification preferences for a user.
   */
  async getPreferences(userId) {
    return notificationPreferenceRepository.getOrCreate(userId);
  },

  /**
   * Update notification preferences.
   */
  async updatePreferences(userId, updates) {
    const allowedUpdates = {};

    if (typeof updates.emailEnabled === 'boolean') {
      allowedUpdates.emailEnabled = updates.emailEnabled;
    }

    if (typeof updates.inAppEnabled === 'boolean') {
      allowedUpdates.inAppEnabled = updates.inAppEnabled;
    }

    if (updates.quietHours) {
      allowedUpdates.quietHours = updates.quietHours;
    }

    if (updates.digest) {
      allowedUpdates.digest = updates.digest;
    }

    if (Array.isArray(updates.types)) {
      allowedUpdates.types = updates.types;
    }

    return notificationPreferenceRepository.update(userId, allowedUpdates);
  },

  /**
   * Update a specific type preference.
   */
  async updateTypePreference(userId, type, { email, inApp }) {
    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
      throw new AppError({
        code: 'NOTIFICATION_TYPE_INVALID',
        message: 'A valid notification type is required.',
        statusCode: 400,
      });
    }

    return notificationPreferenceRepository.updateTypePreference(userId, type, { email, inApp });
  },

  /**
   * Delete old notifications (cleanup job).
   */
  async cleanup(retentionDays = null) {
    const days = retentionDays || notificationConfig.retentionDays;
    return notificationRepository.deleteOldNotifications(days);
  },
};

export {
  notificationService,
};

export default notificationService;
