import joi from "joi";

export const registerSchema = joi.object({
  name: joi.string().trim().min(2).max(80).optional(),
  userName: joi.string().trim().min(2).max(80).optional(),
  email: joi.string().trim().lowercase().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: joi.string().min(6).max(128).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
    "string.max": "Password must be at most 128 characters",
    "any.required": "Password is required",
  }),
  role: joi.string().valid("user", "admin", "superAdmin", "member", "company_admin", "platform_admin").optional(),
  companyId: joi.string().pattern(/^[a-f\d]{24}$/i, "MongoDB ObjectId").optional(),
  status: joi.string().valid("inactive", "active", "suspended", "disabled").optional(),
}).or("name", "userName");

export const loginSchema = joi.object({
  email: joi.string().trim().lowercase().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

export const forgotPasswordSchema = joi.object({
  email: joi.string().trim().lowercase().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const changePasswordSchema = joi.object({
  oldPassword: joi.string().required().messages({
    "string.empty": "Old password is required",
    "any.required": "Old password is required",
  }),
  newPassword: joi.string().min(6).max(128).required().messages({
    "string.empty": "New password is required",
    "string.min": "New password must be at least 6 characters",
    "any.required": "New password is required",
  }),
});

export const resetPasswordSchema = joi.object({
  password: joi.string().min(6).max(128).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
  confirmPassword: joi.string().valid(joi.ref("password")).optional().messages({
    "any.only": "Passwords do not match",
  }),
});

export const updateUserSchema = joi.object({
  role: joi.string().valid("user", "admin", "superAdmin", "member", "company_admin", "platform_admin").optional(),
  status: joi.string().valid("inactive", "active", "suspended", "disabled").optional(),
}).min(1);

