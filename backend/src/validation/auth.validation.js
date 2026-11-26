import joi from "joi";

function getPasswordStrength(password) {
  if (password.length < 8) return "weak";

  const characterTypes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (characterTypes >= 3 && password.length >= 12) return "strong";
  if (characterTypes >= 2) return "medium";
  return "weak";
}

function requireAtLeastMediumStrength(password, helpers) {
  if (getPasswordStrength(password) === "weak") {
    return helpers.error("password.weak");
  }
  return password;
}

const passwordSchema = joi
  .string()
  .min(8)
  .max(128)
  .custom(requireAtLeastMediumStrength)
  .messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must be at most 128 characters",
    "password.weak": "Password is weak. Use at least 8 characters and a mix of character types.",
  });

export const registerSchema = joi.object({
  name: joi.string().trim().min(2).max(80).optional(),
  userName: joi.string().trim().min(2).max(80).optional(),
  email: joi.string().trim().lowercase().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: passwordSchema.required().messages({
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
  oldPassword: joi.string().allow("").optional().messages({
    "string.empty": "Old password is required",
  }),
  newPassword: passwordSchema.required().messages({
    "string.empty": "New password is required",
    "string.min": "New password must be at least 8 characters",
    "string.max": "New password must be at most 128 characters",
    "password.weak": "New password is weak. Use at least 8 characters and a mix of character types.",
    "any.required": "New password is required",
  }),
});

export const resetPasswordTokenSchema = joi.object({
  token: joi.string().pattern(/^[a-f\d]{64}$/i).required().messages({
    "string.pattern.base": "Password reset link is invalid or expired.",
  }),
  password: passwordSchema.required(),
  confirmPassword: joi.string().valid(joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
});

export const updateProfileSchema = joi.object({
  name: joi.string().trim().min(2).max(80),
  userName: joi.string().trim().min(2).max(80),
  email: joi.string().trim().lowercase().email(),
}).min(1);

export const updateUserSchema = joi.object({
  role: joi.string().valid("user", "admin", "superAdmin", "member", "company_admin", "platform_admin").optional(),
  status: joi.string().valid("inactive", "active", "suspended", "disabled").optional(),
}).min(1);
