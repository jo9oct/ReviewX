import joi from "joi";

export const feedbackSchema = joi.object({
  category: joi.string().valid("general", "bug", "feature").required(),
  email: joi.string().trim().email().max(254).allow("").optional(),
  message: joi.string().trim().min(5).max(5000).required(),
});
