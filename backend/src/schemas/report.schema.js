
import Joi from "joi";

export const reportRequestSchema = Joi.object({
  reviewId: Joi.string()
    .trim()
    .hex()
    .length(24)
    .required(),

  type: Joi.string()
    .valid("json", "pdf")
    .required()
}).options({
  abortEarly: false,
  stripUnknown: true
});