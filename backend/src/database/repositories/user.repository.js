// STATUS: UPDATED

/**
 * User repository — all direct MongoDB interactions for the User collection.
 *
 * The service layer never imports Mongoose or touches the User model directly.
 * Only this file interacts with the User model.
 */

import { User } from '../models/user.model.js';

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Find a user by email.
 *
 * Returns a plain JavaScript object.
 *
 * @param {string} email
 * @param {boolean} [withPassword=false]
 * @returns {Promise<object|null>}
 */
export async function findByEmail(email, withPassword = false) {
  const q = User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (withPassword) {
    q.select('+passwordHash');
  }

  return q.lean().exec();
}

/**
 * Find a user by email for authentication.
 *
 * IMPORTANT:
 * This intentionally returns a Mongoose document instead of a lean object
 * because the authentication service needs the User model's verifyPassword()
 * instance method.
 *
 * passwordHash is explicitly selected because the User model hides it by
 * default with select: false.
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findByEmailDocument(email) {
  return User.findOne({
    email: email.toLowerCase().trim(),
  })
    .select('+passwordHash')
    .exec();
}

/**
 * Find a user by MongoDB _id.
 *
 * Returns a plain JavaScript object by default.
 *
 * @param {string} id
 * @param {boolean} [populate=false]
 * @returns {Promise<object|null>}
 */
export async function findById(id, populate = false) {
  const q = User.findById(id);

  if (populate) {
    q.populate('company', 'name plan');
  }

  return q.lean().exec();
}

/**
 * Check whether an email address is already in use.
 *
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function emailExists(email) {
  const count = await User.countDocuments({
    email: email.toLowerCase().trim(),
  });

  return count > 0;
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Persist a new user.
 *
 * Password hashing is handled by the User model's setPassword() method.
 *
 * @param {object} fields
 * @param {string} plainPassword
 * @returns {Promise<object>}
 */
export async function createUser(fields, plainPassword) {
  const user = new User(fields);

  await user.setPassword(plainPassword);
  await user.save();

  return user;
}

/**
 * Stamp the last-login timestamp.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function touchLoginAt(id) {
  await User.findByIdAndUpdate(id, {
    lastLoginAt: new Date(),
  });
}