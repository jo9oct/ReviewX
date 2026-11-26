import bcrypt from "bcrypt";
import Auth from "../model/auth.model.js";
import generateTokenAndSetCookie from "../utils/token.utils.js";
import { createFreeSubscription } from "./subscription.service.js";
import { ApiError } from "../utils/ApiError.js";

export async function register(dto) {
  const { name, userName, email, password, companyId } = dto;

  const cleanEmail = email.toLowerCase().trim();
  const existingUser = await Auth.findOne({ email: cleanEmail });
  if (existingUser) {
    throw ApiError.conflict("An account with that email already exists");
  }

  const effectiveName = (name || userName || "User").trim();
  let effectiveUserName = (userName || "").trim();
  if (!effectiveUserName) {
    effectiveUserName = `${effectiveName.replace(/\s+/g, "").toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new Auth({
    name: effectiveName,
    userName: effectiveUserName,
    email: cleanEmail,
    password: hashedPassword,
    role: "member",
    company: companyId || null,
    status: "active",
    isActive: true,
    lastLogin: new Date(),
    lastLoginAt: new Date(),
  });

  await user.save();

  let subscription = null;
  try {
    subscription = await createFreeSubscription(user._id);
  } catch (_e) {}

  const token = generateTokenAndSetCookie(null, user._id);
  user.sessionToken = token;
  await user.save();

  return {
    token,
    expiresIn: "7d",
    user: user.toPublic ? user.toPublic() : user,
    subscription,
  };
}

export async function login(dto) {
  const { email, password } = dto;
  const user = await Auth.findOne({ email: email.toLowerCase().trim() }).select("+password");

  if (!user) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const isMatch = await user.verifyPassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  if (user.status === "disabled" || user.status === "suspended" || user.isActive === false) {
    throw ApiError.forbidden("Your account has been deactivated");
  }

  const token = generateTokenAndSetCookie(null, user._id);
  user.sessionToken = token;
  user.lastLogin = new Date();
  user.lastLoginAt = new Date();
  await user.save();

  return {
    token,
    expiresIn: "7d",
    user: user.toPublic ? user.toPublic() : user,
  };
}

export async function getMe(userId) {
  const user = await Auth.findById(userId).select("-password");
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return user.toPublic ? user.toPublic() : user;
}

export default {
  register,
  login,
  getMe,
};
