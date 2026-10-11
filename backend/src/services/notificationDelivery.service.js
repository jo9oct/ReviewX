/**
 * Notification delivery service.
 *
 * Handles delivery of notifications through various channels:
 * - In-app (real-time via SSE)
 * - Email (via Resend)
 *
 * Processes notifications from the queue and manages delivery status.
 */

import {
  notificationConfig,
  DELIVERY_CHANNELS,
} from '../config/notification.config.js';

import {
  notificationRepository,
} from '../database/repositories/notification.repository.js';

import {
  notificationPreferenceRepository,
} from '../database/repositories/notificationPreference.repository.js';

import {
  sendEmail,
} from './email.service.js';

import {
  getSSEManager,
} from '../utils/sseManager.js';

import {
  publishNotificationEvent,
} from '../utils/notificationEventBus.js';

// Email rate limiting (per user)
const emailRateLimitCache = new Map();

const checkEmailRateLimit = (userId, maxPerHour) => {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;

  if (!emailRateLimitCache.has(userId)) {
    emailRateLimitCache.set(userId, []);
  }

  const timestamps = emailRateLimitCache.get(userId).filter((t) => t > windowStart);

  if (timestamps.length >= maxPerHour) {
    return false;
  }

  timestamps.push(now);
  emailRateLimitCache.set(userId, timestamps);
  return true;
};

const shouldDeferEmail = (notification, preferences) => {
  // Critical notifications bypass quiet hours
  if (notificationConfig.criticalTypes.includes(notification.type)) {
    return false;
  }

  // Check user's quiet hours
  if (preferences?.isInQuietHours?.()) {
    return true;
  }

  return false;
};

const deliverInApp = async (notification) => {
  try {
    const event = {
      type: 'notification.created',
      data: {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        data: notification.data,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        createdAt: notification.createdAt,
      },
    };

    // Cross-process push: the BullMQ worker publishes to Redis and the server
    // process forwards the event to its local SSE connections.
    const published = await publishNotificationEvent(notification.user.toString(), event);

    // In-process fallback: if Redis pub/sub delivery failed or is unavailable,
    // push directly to the local SSE manager so in-process delivery still reaches
    // connected clients without duplicating events when Redis is healthy.
    if (!published) {
      const sseManager = getSSEManager();
      if (sseManager) {
        sseManager.sendToUser(notification.user.toString(), event);
      }
    }

    // Update delivery status
    await notificationRepository.updateDeliveryStatus(
      notification._id,
      'inApp',
      'delivered',
    );

    return { success: true };
  } catch (error) {
    console.error(`[notificationDelivery] In-app delivery failed: ${error.message}`);

    await notificationRepository.updateDeliveryStatus(
      notification._id,
      'inApp',
      'failed',
    );

    return { success: false, error: error.message };
  }
};

const deliverEmail = async (notification, user, preferences) => {
  try {
    // Check if email channel is enabled for this notification
    if (!notification.channels.includes(DELIVERY_CHANNELS.EMAIL)) {
      await notificationRepository.updateDeliveryStatus(
        notification._id,
        'email',
        'skipped',
      );
      return { success: true, skipped: true };
    }

    // Check email rate limiting
    if (!checkEmailRateLimit(notification.user.toString(), notificationConfig.maxEmailsPerHour)) {
      await notificationRepository.updateDeliveryStatus(
        notification._id,
        'email',
        'skipped',
      );
      return { success: true, skipped: true, reason: 'Rate limit exceeded' };
    }

    // Check quiet hours
    if (shouldDeferEmail(notification, preferences)) {
      await notificationRepository.updateDeliveryStatus(
        notification._id,
        'email',
        'skipped',
      );
      return { success: true, skipped: true, reason: 'Quiet hours' };
    }

    // Build email content
    const emailContent = buildEmailContent(notification, user);

    const result = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    await notificationRepository.updateDeliveryStatus(
      notification._id,
      'email',
      result.sent ? 'delivered' : 'failed',
    );

    return { success: result.sent, error: result.error };
  } catch (error) {
    console.error(`[notificationDelivery] Email delivery failed: ${error.message}`);

    await notificationRepository.updateDeliveryStatus(
      notification._id,
      'email',
      'failed',
    );

    return { success: false, error: error.message };
  }
};

const buildEmailContent = (notification, user) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://reviewx.app';

  const priorityEmoji = {
    0: '🔵', // LOW
    1: '🟢', // NORMAL
    2: '🟡', // HIGH
    3: '🔴', // CRITICAL
  };

  const emoji = priorityEmoji[notification.priority] || '🔵';

  const actionButton = notification.actionUrl
    ? `
      <div style="margin-top: 24px; text-align: center;">
        <a href="${baseUrl}${notification.actionUrl}"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
          ${notification.actionLabel || 'View Details'}
        </a>
      </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${notification.title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <span style="font-size: 24px;">${emoji}</span>
            <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">ReviewX Notification</span>
          </div>

          <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #0f172a;">
            ${notification.title}
          </h1>

          <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
            ${notification.message}
          </p>

          ${notification.data?.description ? `
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                ${notification.data.description}
              </p>
            </div>
          ` : ''}

          ${actionButton}

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              You're receiving this email because you have notifications enabled in your ReviewX settings.
            </p>
            <p style="margin: 4px 0 0; font-size: 12px;">
              <a href="${baseUrl}/notifications/preferences" style="color: #6366f1; text-decoration: none;">
                Manage notification preferences
              </a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${emoji} ReviewX Notification

${notification.title}

${notification.message}

${notification.actionUrl ? `View details: ${baseUrl}${notification.actionUrl}` : ''}

---
Manage preferences: ${baseUrl}/notifications/preferences
  `.trim();

  return {
    subject: `${emoji} ${notification.title}`,
    html,
    text,
  };
};

const notificationDeliveryService = {
  /**
   * Process a notification from the queue.
   * Delivers through all configured channels.
   */
  async process(notificationId) {
    const notification = await notificationRepository.findById(notificationId);

    if (!notification) {
      console.warn(`[notificationDelivery] Notification ${notificationId} not found`);
      return { success: false, error: 'Notification not found' };
    }

    // Skip if already deleted
    if (notification.deletedAt) {
      return { success: true, skipped: true };
    }

    // Get user
    const { User } = await import('../database/models/user.model.js');
    const user = await User.findById(notification.user).select('name email');

    if (!user) {
      console.warn(`[notificationDelivery] User ${notification.user} not found`);
      return { success: false, error: 'User not found' };
    }

    // Get preferences
    const preferences = await notificationPreferenceRepository.getOrCreate(notification.user);

    const results = {
      inApp: null,
      email: null,
    };

    // Deliver in-app
    if (notification.channels.includes(DELIVERY_CHANNELS.IN_APP)) {
      results.inApp = await deliverInApp(notification);
    }

    // Deliver email
    if (notification.channels.includes(DELIVERY_CHANNELS.EMAIL)) {
      results.email = await deliverEmail(notification, user, preferences);
    }

    const anySuccess = results.inApp?.success || results.email?.success;

    return {
      success: anySuccess,
      results,
    };
  },

  /**
   * Deliver a notification immediately (bypass queue).
   * Used for critical notifications.
   */
  async deliverImmediately(notificationId) {
    return this.process(notificationId);
  },
};

export {
  notificationDeliveryService,
};

export default notificationDeliveryService;
