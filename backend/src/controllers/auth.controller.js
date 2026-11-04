import bcrypt from "bcrypt";
import crypto from "crypto";
import Auth from "../model/auth.model.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "../validation/auth.validation.js";
import generateTokenAndSetCookie from "../utils/token.utils.js";
import { sanitizeObject } from "../utils/sanitize.utils.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} from "../email/emails.js";
import { createFreeSubscription } from "../services/subscription.service.js";

function buildSafeUser(user) {
  const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.passwordHash;
  delete obj.verificationToken;
  delete obj.resetPasswordToken;
  delete obj.__v;

  return {
    id: obj._id ? obj._id.toString() : obj.id,
    _id: obj._id ? obj._id.toString() : obj.id,
    name: obj.name || obj.userName || "User",
    userName: obj.userName || obj.name || "User",
    email: obj.email,
    role: obj.role,
    company: obj.company ?? null,
    status: obj.status || (obj.isActive ? "active" : "inactive"),
    isActive: obj.status === "active" || obj.isActive === true,
    lastLogin: obj.lastLogin || obj.lastLoginAt,
    lastLoginAt: obj.lastLoginAt || obj.lastLogin,
    provider: obj.provider || "local",
    Photo: obj.Photo || "",
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

export const AuthRegister = async (req, res) => {
  try {
    const sanitizedData = sanitizeObject(req.body);
    const { error } = registerSchema.validate(sanitizedData);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details?.[0]?.message || "Validation error",
        error: {
          code: "VALIDATION_ERROR",
          message: error.details?.[0]?.message || "Validation error",
        },
      });
    }

    const email = sanitizedData.email.toLowerCase().trim();
    const existingUser = await Auth.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists",
        error: {
          code: "CONFLICT",
          message: "An account with that email already exists",
        },
      });
    }

    const name = (sanitizedData.name || sanitizedData.userName || "").trim();
    let userName = (sanitizedData.userName || "").trim();

    if (!userName) {
      const base = name.replace(/\s+/g, "").toLowerCase() || "user";
      userName = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const existingUserName = await Auth.findOne({ userName });
    if (existingUserName) {
      userName = `${userName}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("DEV VERIFICATION TOKEN:", verificationToken);
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const hashedPassword = await bcrypt.hash(sanitizedData.password, 10);

    const initialStatus =
      sanitizedData.status ||
      (process.env.REQUIRE_EMAIL_VERIFICATION === "true" ? "inactive" : "active");

    const newAuth = new Auth({
      name,
      userName,
      email,
      password: hashedPassword,
      role: sanitizedData.role || "member",
      company: sanitizedData.companyId || null,
      status: initialStatus,
      isActive: initialStatus === "active",
      verificationToken,
      verificationTokenExpiresAt,
      lastLogin: new Date(),
      lastLoginAt: new Date(),
    });

    await newAuth.save();

    let subscription = null;
    try {
      subscription = await createFreeSubscription(newAuth._id);
    } catch (subErr) {
      console.warn("Could not create free subscription automatically:", subErr.message);
    }

    const Token = generateTokenAndSetCookie(res, newAuth._id);
    newAuth.sessionToken = Token;
    await newAuth.save();

    const supportEmail = process.env.SUPPORT_EMAIL || "jops7326@gmail.com";
    const year = new Date().getFullYear();
    const frontendBaseUrl =
      process.env.FRONTEND_URL || process.env.FRONT_END_BASE_URL || "http://localhost:5173";
    const exploreLink = `${frontendBaseUrl}/verify`;

    let emailSent = true;
    try {
      await sendVerificationEmail(
        email,
        verificationToken,
        exploreLink,
        name || userName,
        supportEmail,
        year
      );
    } catch (err) {
      console.log("Email Send Failed: " + (err.message || err));
      emailSent = false;
    }

    const safeUser = buildSafeUser(newAuth);

    const payload = {
      token: Token,
      expiresIn: "7d",
      user: safeUser,
      subscription,
    };

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Registration successful. Verification email sent."
        : "Registration successful. But Failed To Send Verification Email.",
      token: Token,
      expiresIn: "7d",
      user: safeUser,
      subscription,
      data: payload,
    });
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
};

export const VerifyAuth = async (req, res) => {
  const { verificationToken } = req.body;

  if (!verificationToken) {
    return res.status(400).json({
      success: false,
      message: "Verification token is required.",
    });
  }

  try {
    const findUser = await Auth.findOne({
      verificationToken,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!findUser) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code.",
      });
    }

    findUser.status = "active";
    findUser.isActive = true;
    findUser.verificationToken = undefined;
    findUser.verificationTokenExpiresAt = undefined;

    const Token = generateTokenAndSetCookie(res, findUser._id);
    findUser.sessionToken = Token;

    await findUser.save();

    const logo = "../public/My-Logo.png";
    const frontendBaseUrl =
      process.env.FRONTEND_URL || process.env.FRONT_END_BASE_URL || "http://localhost:5173";
    const exploreLink = `${frontendBaseUrl}/dashboard`;
    const supportEmail = process.env.SUPPORT_EMAIL || "jops7326@gmail.com";
    const year = new Date().getFullYear();

    try {
      await sendWelcomeEmail(
        findUser.email,
        findUser.name || findUser.userName,
        logo,
        exploreLink,
        supportEmail,
        year
      );
    } catch (emailErr) {
      console.error("Warning: Failed to send welcome email:", emailErr);
    }

    const safeUser = buildSafeUser(findUser);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You are now logged in.",
      token: Token,
      expiresIn: "7d",
      user: safeUser,
      data: {
        token: Token,
        expiresIn: "7d",
        user: safeUser,
      },
    });
  } catch (err) {
    console.error("Server Error in VerifyAuth:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const AuthLogin = async (req, res) => {
  const sanitizedData = sanitizeObject(req.body);
  const { error } = loginSchema.validate(sanitizedData);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details?.[0]?.message || "Validation error",
      error: {
        code: "VALIDATION_ERROR",
        message: error.details?.[0]?.message || "Validation error",
      },
    });
  }

  const { email, password } = sanitizedData;

  try {
    const existingUser = await Auth.findOne({ email: email.toLowerCase().trim() });

    if (!existingUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        error: { code: "UNAUTHORIZED", message: "Invalid email or password" },
      });
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        error: { code: "UNAUTHORIZED", message: "Invalid email or password" },
      });
    }

    if (existingUser.status === "disabled" || existingUser.status === "suspended" || existingUser.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
        error: { code: "ACCOUNT_DISABLED", message: "Your account has been deactivated" },
      });
    }

    if (existingUser.status === "inactive" && process.env.REQUIRE_EMAIL_VERIFICATION === "true") {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        error: { code: "EMAIL_NOT_VERIFIED", message: "Please verify your email before logging in." },
      });
    }

    const Token = generateTokenAndSetCookie(res, existingUser._id);
    if (!Token) {
      return res.status(401).json({ success: false, message: "Token not created" });
    }

    existingUser.sessionToken = Token;
    existingUser.lastLogin = new Date();
    existingUser.lastLoginAt = new Date();

    await existingUser.save();

    const safeUser = buildSafeUser(existingUser);

    const payload = {
      token: Token,
      expiresIn: "7d",
      user: safeUser,
    };

    return res.status(200).json({
      success: true,
      message: "User login successfully",
      token: Token,
      expiresIn: "7d",
      user: safeUser,
      data: payload,
    });
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
};

export const checkAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    if (req.user.status === "inactive" && process.env.REQUIRE_EMAIL_VERIFICATION === "true") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Please verify your email to continue.",
        error: { code: "EMAIL_NOT_VERIFIED", message: "Access denied. Please verify your email to continue." },
      });
    }

    const safeUser = buildSafeUser(req.user);

    return res.status(200).json({
      success: true,
      user: safeUser,
      data: { user: safeUser },
    });
  } catch (err) {
    console.error("Error in checkAuth:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
};

export const getMe = checkAuth;

export const Logout = async (req, res) => {
  try {
    if (req.user) {
      await Auth.findByIdAndUpdate(req.user._id || req.user.id, {
        sessionToken: "",
      });
    }
  } catch (_e) {}

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.clearCookie("token");

  return res.status(200).json({ success: true, message: "Logged out successfully." });
};

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete account",
      });
    }

    const user = await Auth.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    await user.deleteOne();

    res.clearCookie("refreshToken");
    res.clearCookie("token");

    return res.status(200).json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("Error deleting account:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const user = await Auth.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.status === "active") {
      return res.status(400).json({ success: false, message: "User already verified." });
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const supportEmail = process.env.SUPPORT_EMAIL || "jops7326@gmail.com";
    const year = new Date().getFullYear();
    const frontendBaseUrl =
      process.env.FRONTEND_URL || process.env.FRONT_END_BASE_URL || "http://localhost:5173";
    const exploreLink = `${frontendBaseUrl}/verify`;

    try {
      await sendVerificationEmail(
        user.email,
        verificationToken,
        exploreLink,
        user.name || user.userName,
        supportEmail,
        year
      );
      return res.status(200).json({ success: true, message: "Verification email resent." });
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email.",
      });
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const forgotPassword = async (req, res) => {
  const sanitizedData = sanitizeObject(req.body);
  const { error } = forgotPasswordSchema.validate(sanitizedData);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details?.[0]?.message || "Validation error",
    });
  }

  const { email } = sanitizedData;

  try {
    const user = await Auth.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email not found",
      });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetpasswordExpiresAt = resetTokenExpiresAt;
    await user.save();

    const logo = "../public/My-Logo.png";
    const supportEmail = process.env.SUPPORT_EMAIL || "jops7326@gmail.com";
    const year = new Date().getFullYear();
    const frontendBaseUrl =
      process.env.FRONTEND_URL || process.env.FRONT_END_BASE_URL || "http://localhost:5173";
    const resetLink = `${frontendBaseUrl}/reset-password/${resetToken}`;

    await sendPasswordResetEmail(
      user.email,
      resetLink,
      user.name || user.userName,
      logo,
      supportEmail,
      year
    );

    return res.status(200).json({ success: true, message: "Password reset email sent." });
  } catch (err) {
    console.error("Error in forgotPassword:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: err.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token || req.body.token;
    const sanitizedData = sanitizeObject(req.body);

    const { error } = resetPasswordSchema.validate(sanitizedData);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details?.[0]?.message || "Validation error",
      });
    }

    const { password } = sanitizedData;

    const user = await Auth.findOne({
      resetPasswordToken: token,
      resetpasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetpasswordExpiresAt = undefined;
    await user.save();

    const logo = "../public/My-Logo.png";
    const frontendBaseUrl =
      process.env.FRONTEND_URL || process.env.FRONT_END_BASE_URL || "http://localhost:5173";
    const loginLink = `${frontendBaseUrl}/auth`;
    const supportEmail = process.env.SUPPORT_EMAIL || "jops7326@gmail.com";
    const year = new Date().getFullYear();

    try {
      await sendResetSuccessEmail(
        user.email,
        logo,
        user.name || user.userName,
        loginLink,
        supportEmail,
        year
      );
    } catch (emailError) {
      console.error("Failed to send reset success email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (err) {
    console.error("Error in resetPassword:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: err.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  const targetId = req.params._id || req.user._id || req.user.id;

  const sanitizedData = sanitizeObject(req.body);
  delete sanitizedData.password;
  delete sanitizedData.sessionToken;
  delete sanitizedData.verificationToken;
  delete sanitizedData.resetPasswordToken;

  try {
    const foundUser = await Auth.findByIdAndUpdate(targetId, { ...sanitizedData }, { new: true });
    if (!foundUser) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    const safeUser = buildSafeUser(foundUser);
    return res.status(200).json({
      success: true,
      message: "Profile Updated Successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const changePassword = async (req, res) => {
  const targetId = req.params._id || req.user._id || req.user.id;
  const sanitizedData = sanitizeObject(req.body);

  const { error } = changePasswordSchema.validate(sanitizedData);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details?.[0]?.message || "Validation error",
    });
  }

  const { oldPassword, newPassword } = sanitizedData;

  try {
    const foundUser = await Auth.findById(targetId);
    if (!foundUser) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, foundUser.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid current password" });
    }

    foundUser.password = await bcrypt.hash(newPassword, 10);
    await foundUser.save();

    return res.status(200).json({ success: true, message: "Password Changed Successfully" });
  } catch (error) {
    console.error("Error in changePassword:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const allowed = ["admin", "superAdmin", "platform_admin"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const foundAllUser = await Auth.find({}).sort({ createdAt: -1 });
    const usersWithoutPassword = foundAllUser.map((user) => buildSafeUser(user));

    return res.status(200).json({ success: true, users: usersWithoutPassword });
  } catch (error) {
    console.error("Error in getAllUser:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateUser = async (req, res) => {
  const { _id } = req.params;
  const sanitizedData = sanitizeObject(req.body);

  const allowed = ["admin", "superAdmin", "platform_admin"];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }

  const { error } = updateUserSchema.validate(sanitizedData);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details?.[0]?.message || "Validation error",
    });
  }

  const { role, status } = sanitizedData;

  try {
    const updateFields = {};
    if (role) updateFields.role = role;
    if (status) {
      updateFields.status = status;
      updateFields.isActive = status === "active";
    }

    const foundUser = await Auth.findByIdAndUpdate(_id, updateFields, { new: true });
    if (!foundUser) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    return res.status(200).json({
      success: true,
      message: "User Updated Successfully",
      user: buildSafeUser(foundUser),
    });
  } catch (error) {
    console.error("Error in updateUser:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteUser = async (req, res) => {
  const { _id } = req.params;

  try {
    const allowed = ["admin", "superAdmin", "platform_admin"];
    if (req.user && !allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const deletedUser = await Auth.findByIdAndDelete(_id);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    return res.status(200).json({ success: true, message: "User Deleted Successfully" });
  } catch (error) {
    console.error("Error in deleteUser:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Aliases for compatibility
export const register = AuthRegister;
export const login = AuthLogin;
