/**
 * User repository — all direct MongoDB interactions for the User collection.
 *
 * The service layer never imports Mongoose or touches the User model directly.
 * Only this file does. That decouples business logic from the DB driver and
 * makes mocking straightforward in tests.
 *
 * All `lean()` calls return plain JS objects (faster, no Mongoose overhead).
 * Instance methods (setPassword, verifyPassword) are NOT available on lean
 * objects — the repository handles hashing internally via the model where needed.
 */

import { User } from '../models/User.js';

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Find a user by email.
 *
 * @param {string}  email
 * @param {boolean} [withPassword=false]  Re-include the select:false passwordHash field
 * @returns {Promise<object|null>}        Plain object (lean), or null
 */
export async function findByEmail(email, withPassword = false) {
  const q = User.findOne({ email: email.toLowerCase().trim() });
  if (withPassword) q.select('+passwordHash');
  return q.lean().exec();
}

/**
 * Find a user by MongoDB _id.
 *
 * populate is intentionally false by default — the Company model does not
 * exist yet. Set to true once Company is registered or it will throw
 * MissingSchemaError at query execution time.
 *
 * @param {string}  id
 * @param {boolean} [populate=false]
 * @returns {Promise<object|null>}
 */
export async function findById(id, populate = false) {
  const q = User.findById(id);
  if (populate) q.populate('company', 'name plan');
  return q.lean().exec();
}

/**
 * Check whether an email address is already in use.
 *
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function emailExists(email) {
  const n = await User.countDocuments({ email: email.toLowerCase().trim() });
  return n > 0;
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Persist a new user.
 *
 * Hashing is handled here via the model's `setPassword` instance method
 * so no raw passwords ever flow through the service layer.
 *
 * @param {{ name: string, email: string, role?: string, company?: string|null }} fields
 * @param {string} plainPassword  Will be hashed before storage
 * @returns {Promise<object>}     Saved Mongoose document (has instance methods)
 */
export async function createUser(fields, plainPassword) {
  const user = new User(fields);
  await user.setPassword(plainPassword);
  await user.save();
  return user;   // return full document so caller can call .toPublic() etc.
}

/**
 * Stamp the last-login timestamp — called fire-and-forget after successful login.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function touchLoginAt(id) {
  await User.findByIdAndUpdate(id, { lastLoginAt: new Date() });
}
