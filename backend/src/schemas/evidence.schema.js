
import Joi from "joi";

export const evidenceSchema = Joi.object({
  reviewId: Joi.string()
    .trim()
    .allow(null, "")
    .default(null),

  findingId: Joi.string()
    .trim()
    .allow(null, "")
    .default(null),

  type: Joi.string()
    .valid(
      "source",
      "pattern",
      "rule",
      "context"
    )
    .required(),

  file: Joi.string()
    .trim()
    .max(500)
    .allow(null, "")
    .default(null),

  line: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .default(null),

  column: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .default(null),

  code: Joi.string()
    .max(10000)
    .allow(null, "")
    .default(null),

  description: Joi.string()
    .trim()
    .min(1)
    .max(5000)
    .required()
}).options({
  abortEarly: false,
  stripUnknown: true
});