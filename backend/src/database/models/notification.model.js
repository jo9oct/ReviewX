/**
 * Notification model.
 *
 * Stores all notifications for users across the system.
 * Supports multiple delivery channels, priority levels,
 * and action links.
 */

import mongoose from 'mongoose';

import {
  NOTIFICATION_TYPES,
  DELIVERY_CHANNELS,
  PRIORITY_LEVELS,
} from '../../config/notification.config.js';

const notificationSchema = new mongoose.Schema(
  {
    // Recipient
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Company context (optional - null for personal notifications)
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },

    // Notification type
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },

    // Display content
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    // Structured data for deep linking and rendering
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Priority level
    priority: {
      type: Number,
      enum: Object.values(PRIORITY_LEVELS),
      default: PRIORITY_LEVELS.NORMAL,
    },

    // Delivery channels used
    channels: [{
      type: String,
      enum: Object.values(DELIVERY_CHANNELS),
    }],

    // Delivery status per channel
    deliveryStatus: {
      inApp: {
        type: String,
        enum: ['pending', 'delivered', 'failed'],
        default: 'pending',
      },
      email: {
        type: String,
        enum: ['pending', 'delivered', 'failed', 'skipped'],
        default: 'pending',
      },
    },

    // Read state
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    // Action link
    actionUrl: {
      type: String,
      default: null,
    },
    actionLabel: {
      type: String,
      default: null,
    },

    // Expiration (TTL index)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },

    // Soft delete
    deletedAt: {
      type: Date,
      default: null,
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
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ company: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ 'data.reviewId': 1 });
notificationSchema.index({ 'data.findingId': 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// Static methods
notificationSchema.statics.findForUser = function (userId, { unreadOnly = false, type = null, limit = 20, offset = 0 } = {}) {
  const query = { user: userId, deletedAt: null };

  if (unreadOnly) {
    query.read = false;
  }

  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
};

notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ user: userId, read: false, deletedAt: null });
};

notificationSchema.statics.markAsRead = function (notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId, deletedAt: null },
    { read: true, readAt: new Date() },
    { new: true },
  );
};

notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { user: userId, read: false, deletedAt: null },
    { read: true, readAt: new Date() },
  );
};

// Instance methods
notificationSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

export const Notification = mongoose.model('Notification', notificationSchema);
