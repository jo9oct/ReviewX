/**
 * Notification preference repository.
 *
 * Handles all MongoDB operations for notification preferences.
 */

import { NotificationPreference } from '../models/notificationPreference.model.js';

const findByUserId = async (userId) => {
  return NotificationPreference.findOne({ user: userId });
};

const getOrCreate = async (userId) => {
  return NotificationPreference.getOrCreate(userId);
};

const update = async (userId, updates) => {
  return NotificationPreference.findOneAndUpdate(
    { user: userId },
    updates,
    { new: true, upsert: true },
  );
};

const updateTypePreference = async (userId, type, { email, inApp }) => {
  const prefs = await getOrCreate(userId);

  const existingIndex = prefs.types.findIndex((t) => t.type === type);

  if (existingIndex >= 0) {
    prefs.types[existingIndex].email = email;
    prefs.types[existingIndex].inApp = inApp;
  } else {
    prefs.types.push({ type, email, inApp });
  }

  await prefs.save();
  return prefs;
};

const updateQuietHours = async (userId, quietHours) => {
  return update(userId, { quietHours });
};

const updateDigest = async (userId, digest) => {
  return update(userId, { digest });
};

const updateGlobalToggles = async (userId, { emailEnabled, inAppEnabled }) => {
  return update(userId, { emailEnabled, inAppEnabled });
};

export const notificationPreferenceRepository = {
  findByUserId,
  getOrCreate,
  update,
  updateTypePreference,
  updateQuietHours,
  updateDigest,
  updateGlobalToggles,
};
