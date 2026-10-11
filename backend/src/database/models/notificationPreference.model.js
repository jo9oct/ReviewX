/**
 * Notification preference model.
 *
 * Stores per-user notification preferences including channel toggles,
 * quiet hours, and digest settings.
 */

import mongoose from 'mongoose';

import {
  NOTIFICATION_TYPES,
  DELIVERY_CHANNELS,
  DEFAULT_CHANNELS,
} from '../../config/notification.config.js';

const typePreferenceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    email: {
      type: Boolean,
      default: true,
    },
    inApp: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const quietHoursSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    start: {
      type: String,
      default: '22:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    end: {
      type: String,
      default: '08:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  { _id: false },
);

const digestSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    time: {
      type: String,
      default: '09:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  { _id: false },
);

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Global toggles
    emailEnabled: {
      type: Boolean,
      default: true,
    },
    inAppEnabled: {
      type: Boolean,
      default: true,
    },

    // Per-type preferences
    types: {
      type: [typePreferenceSchema],
      default: () =>
        Object.entries(DEFAULT_CHANNELS).map(([type, channels]) => ({
          type,
          email: channels.includes(DELIVERY_CHANNELS.EMAIL),
          inApp: channels.includes(DELIVERY_CHANNELS.IN_APP),
        })),
    },

    // Quiet hours
    quietHours: {
      type: quietHoursSchema,
      default: () => ({}),
    },

    // Digest settings
    digest: {
      type: digestSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes
notificationPreferenceSchema.index({ user: 1 }, { unique: true });

// Static methods
notificationPreferenceSchema.statics.getOrCreate = async function (userId) {
  let prefs = await this.findOne({ user: userId });

  if (!prefs) {
    prefs = await this.create({ user: userId });
  }

  return prefs;
};

// Instance methods
notificationPreferenceSchema.methods.getChannelPreference = function (type) {
  const typePref = this.types.find((t) => t.type === type);

  if (!typePref) {
    const defaults = DEFAULT_CHANNELS[type] || [DELIVERY_CHANNELS.IN_APP];
    return {
      email: defaults.includes(DELIVERY_CHANNELS.EMAIL),
      inApp: defaults.includes(DELIVERY_CHANNELS.IN_APP),
    };
  }

  return {
    email: typePref.email && this.emailEnabled,
    inApp: typePref.inApp && this.inAppEnabled,
  };
};

notificationPreferenceSchema.methods.isInQuietHours = function (date = new Date()) {
  if (!this.quietHours?.enabled) {
    return false;
  }

  const { start, end, timezone } = this.quietHours;

  // Convert to user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const currentTime = hour * 60 + minute;

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
};

export const NotificationPreference = mongoose.model(
  'NotificationPreference',
  notificationPreferenceSchema,
);
