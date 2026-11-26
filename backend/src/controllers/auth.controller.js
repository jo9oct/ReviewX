import bcrypt from "bcrypt";
import crypto from "crypto";
import Auth from "../model/auth.model.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  resetPasswordTokenSchema,
  updateProfileSchema,
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
  const hasPassword =
    typeof user.hasPassword === "boolean" ? user.hasPassword : Boolean(user.password);
  const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.passwordHash;
  delete obj.verificationToken;
  delete obj.resetPasswordToken;
  delete obj.__v;

  const isVerified = obj.status === "active";

  return {
    id: obj._id ? obj._id.toString() : obj.id,
    _id: obj._id ? obj._id.toString() : obj.id,
    name: obj.name || obj.userName || "User",
    userName: obj.userName || obj.name || "User",
    email: obj.email,
    role: obj.role,
    company: obj.company ?? null,
    status: obj.status || (obj.isActive ? "active" : "inactive"),
    isActive: obj.status === "active",
    isVerified,
    lastLogin: obj.lastLogin || obj.lastLoginAt,
    lastLoginAt: obj.lastLoginAt || obj.lastLogin,
    provider: obj.provider || "local",
    hasPassword,
    Photo: obj.Photo || "",
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function hashResetToken(token) {
  const secret = process.env.Refresh_Secret_Key || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("A JWT signing secret is required to issue password reset tokens.");
  }
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function getFrontendBaseUrl() {
  const baseUrl = process.env.FRONTEND_URL || process.env.FRONT_END_BASE_URL;
  if (!baseUrl) {
    throw new Error("FRONTEND_URL or FRONT_END_BASE_URL must be configured.");
  }
  return baseUrl.trim().replace(/\/+$/, "");
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

    const verificationToken = crypto.randomInt(100000, 1000000).toString();
    const verificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const hashedPassword = await bcrypt.hash(sanitizedData.password, 10);

    const initialStatus = "inactive";

    const newAuth = new Auth({
      name,
      userName,
      email,
      password: hashedPassword,
      role: sanitizedData.role || "member",
      company: sanitizedData.companyId || null,
      status: initialStatus,
      isActive: false,
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

    // Do NOT generate session token or set cookie upon registration.
    // The user MUST verify their 6-digit code before they can access the application.
    newAuth.sessionToken = "";
    await newAuth.save();

    const supportEmail = process.env.SUPPORT_EMAIL || "jops7326@gmail.com";
    const year = new Date().getFullYear();
    const frontendBaseUrl = getFrontendBaseUrl();
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
    } catch (_err) {
      console.log("Verification email could not be sent.");
      emailSent = false;
    }

    const safeUser = buildSafeUser(newAuth);

    const payload = {
      user: safeUser,
      subscription,
      requiresVerification: true,
      email,
    };

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Registration successful. Please enter the 6-digit verification code sent to your email."
        : "Registration successful. Verification code generated.",
      requiresVerification: true,
      emailSent,
      email,
      user: safeUser,
      subscription,
      data: payload,
    });
  } catch (err) {
    console.error("Error during registration.");
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
};

export const VerifyAuth = async (req, res) => {
  const token = (req.body.verificationToken || req.body.code || "").toString().trim();
  const email = (req.body.email || "").toString().trim().toLowerCase();

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Verification code is required.",
      error: { code: "VALIDATION_ERROR", message: "Verification code is required." },
    });
  }

  try {
    const query = {
      verificationToken: token,
      verificationTokenExpiresAt: { $gt: Date.now() },
    };
    if (email) {
      query.email = email;
    }

    let findUser = await Auth.findOne(query);

    if (!findUser) {
      if (email) {
        const alreadyActive = await Auth.findOne({ email, status: "active" });
        if (alreadyActive) {
          const Token = generateTokenAndSetCookie(res, alreadyActive._id);
          alreadyActive.sessionToken = Token;
          await alreadyActive.save();
          return res.status(200).json({
            success: true,
            message: "Email is already verified. You are now logged in.",
            token: Token,
            expiresIn: "7d",
            user: buildSafeUser(alreadyActive),
            data: {
              token: Token,
              expiresIn: "7d",
              user: buildSafeUser(alreadyActive),
            },
          });
        }
      }

      const expiredUser = await Auth.findOne({ verificationToken: token });
      if (expiredUser) {
        return res.status(400).json({
          success: false,
          message: "Verification code has expired. Please request a new code.",
          error: { code: "CODE_EXPIRED", message: "Verification code has expired. Please request a new code." },
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code.",
        error: { code: "INVALID_CODE", message: "Invalid or expired verification code." },
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
    const frontendBaseUrl = getFrontendBaseUrl();
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
    } catch (_emailErr) {
      console.error("Warning: Failed to send welcome email.");
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
  } catch (_err) {
    console.error("Server Error in VerifyAuth.");
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

    // Check if user is not verified FIRST
    if (existingUser.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in. A 6-digit verification code is required.",
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email before logging in.",
          email: existingUser.email,
        },
        requiresVerification: true,
        email: existingUser.email,
      });
    }

    if (existingUser.status === "disabled" || existingUser.status === "suspended" || existingUser.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
        error: { code: "ACCOUNT_DISABLED", message: "Your account has been deactivated" },
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
    const email = (req.body?.email || req.query?.email || req.user?.email || "").toLowerCase().trim();
    let user = null;

    if (email) {
      user = await Auth.findOne({ email });
    } else if (req.user?._id || req.user?.id) {
      user = await Auth.findById(req.user._id || req.user.id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please register first.",
        error: { code: "USER_NOT_FOUND", message: "Account not found." },
      });
    }

    if (user.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Your account is already verified. Please sign in.",
        error: { code: "ALREADY_VERIFIED", message: "Your account is already verified. Please sign in." },
      });
    }

    const verificationToken = crypto.randomInt(100000, 1000000).toString();
    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const supportEmail = process.env.SUPPORT_EMAIL || "jops7326@gmail.com";
    const year = new Date().getFullYear();
    const frontendBaseUrl = getFrontendBaseUrl();
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
      return res.status(200).json({
        success: true,
        message: "A new 6-digit verification code has been sent to your email.",
      });
    } catch (_emailErr) {
      console.error("Email sending failed.");
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
      });
    }
  } catch (_error) {
    console.error("Resend verification error.");
    return res.status(500).json({ success: false, message: "Internal server error" });
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
      return res.status(200).json({
        success: true,
        message: "If an account exists for that email, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetpasswordExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const logo = "../public/My-Logo.png";
    const supportEmail = process.env.SUPPORT_EMAIL || "jops7326@gmail.com";
    const year = new Date().getFullYear();
    const resetUrl = new URL("/reset-password", getFrontendBaseUrl());
    resetUrl.searchParams.set("token", resetToken);
    try {
      await sendPasswordResetEmail(
        user.email,
        resetUrl.toString(),
        user.name || user.userName,
        logo,
        supportEmail,
        year,
      );
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetpasswordExpiresAt = undefined;
      await user.save();
      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (_err) {
    console.error("Error in forgotPassword.");
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const sanitizedData = sanitizeObject(req.body);
    const resetData = {
      ...sanitizedData,
      token: req.params.token || sanitizedData.token,
    };
    const { error } = resetPasswordTokenSchema.validate(resetData);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details?.[0]?.message || "Validation error",
      });
    }

    const { token, password } = resetData;

    const user = await Auth.findOne({
      resetPasswordToken: hashResetToken(token),
      resetpasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetpasswordExpiresAt = undefined;
    user.sessionToken = "";
    await user.save();

    const logo = "../public/My-Logo.png";
    const frontendBaseUrl = getFrontendBaseUrl();
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
    } catch (_emailError) {
      console.error("Failed to send reset success email.");
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (_err) {
    console.error("Error in resetPassword.");
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

export const updateProfile = async (req, res) => {
  const sanitizedData = sanitizeObject(req.body);
  const { error } = updateProfileSchema.validate(sanitizedData);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details?.[0]?.message || "Validation error",
    });
  }

  try {
    const updates = {};
    for (const field of ["name", "userName", "email"]) {
      if (sanitizedData[field] !== undefined) {
        updates[field] =
          field === "email" ? sanitizedData[field].toLowerCase().trim() : sanitizedData[field].trim();
      }
    }

    const foundUser = await Auth.findByIdAndUpdate(
      req.user._id || req.user.id,
      { $set: updates },
      { new: true, runValidators: true },
    );
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
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({ success: false, message: "That email is already in use." });
    }
    console.error("Error updating profile:", error.message);
    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};

export const changePassword = async (req, res) => {
  const targetId = req.user._id || req.user.id;
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

    if (foundUser.password) {
      if (!oldPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required",
        });
      }

      const isMatch = await bcrypt.compare(oldPassword, foundUser.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Invalid current password" });
      }
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
