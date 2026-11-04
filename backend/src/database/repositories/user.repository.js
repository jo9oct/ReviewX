import { User } from "../models/user.model.js";

export async function findByEmail(email, withPassword = false) {
  const q = User.findOne({
    email: email.toLowerCase().trim(),
  });

  return q.lean().exec();
}

export async function findByEmailDocument(email) {
  return User.findOne({
    email: email.toLowerCase().trim(),
  }).exec();
}

export async function findById(id, populate = false) {
  const q = User.findById(id);

  if (populate) {
    q.populate("company", "name plan");
  }

  return q.lean().exec();
}

export async function emailExists(email) {
  const count = await User.countDocuments({
    email: email.toLowerCase().trim(),
  });

  return count > 0;
}

export async function createUser(fields, plainPassword) {
  const user = new User(fields);

  if (plainPassword) {
    await user.setPassword(plainPassword);
  }
  await user.save();

  return user;
}

export async function touchLoginAt(id) {
  const now = new Date();
  await User.findByIdAndUpdate(id, {
    lastLogin: now,
    lastLoginAt: now,
  });
}

export default {
  findByEmail,
  findByEmailDocument,
  findById,
  emailExists,
  createUser,
  touchLoginAt,
};
