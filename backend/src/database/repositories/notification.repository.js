/**
 * Notification repository.
 *
 * Handles all MongoDB operations for notifications.
 */

import { Notification } from '../models/notification.model.js';

const create = async (data) => {
  return Notification.create(data);
};

const createMany = async (dataArray) => {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return [];
  }
  return Notification.insertMany(dataArray);
};

const findById = async (id) => {
  return Notification.findOne({ _id: id, deletedAt: null });
};

const findForUser = async (userId, { unreadOnly = false, type = null, limit = 20, offset = 0 } = {}) => {
  return Notification.findForUser(userId, { unreadOnly, type, limit, offset });
};

const findForCompany = async (companyId, { limit = 50, offset = 0 } = {}) => {
  return Notification.find({ company: companyId, deletedAt: null })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
};

const getUnreadCount = async (userId) => {
  return Notification.getUnreadCount(userId);
};

const markAsRead = async (notificationId, userId) => {
  return Notification.markAsRead(notificationId, userId);
};

const markAllAsRead = async (userId) => {
  return Notification.markAllAsRead(userId);
};

const softDelete = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    return null;
  }

  await notification.softDelete();
  return notification;
};

const updateDeliveryStatus = async (notificationId, channel, status) => {
  const field = `deliveryStatus.${channel}`;
  return Notification.findByIdAndUpdate(
    notificationId,
    { [field]: status },
    { new: true },
  );
};

const deleteOldNotifications = async (retentionDays = 90) => {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return Notification.deleteMany({
    expiresAt: { $lt: cutoffDate },
    deletedAt: null,
  });
};

export const notificationRepository = {
  create,
  createMany,
  findById,
  findForUser,
  findForCompany,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  softDelete,
  updateDeliveryStatus,
  deleteOldNotifications,
};
