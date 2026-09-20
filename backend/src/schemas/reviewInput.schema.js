
import Joi from "joi";

const companyRuleSchema = Joi.object({
  id: Joi.string()
    .trim()
    .max(150),

  name: Joi.string()
    .trim()
    .max(200)
    .required(),

  description: Joi.string()
    .trim()
    .max(5000)
    .required(),

  category: Joi.string()
    .trim()
    .max(100)
    .default("general"),

  severity: Joi.string()
    .valid(
      "critical",
      "high",
      "medium",
      "low",
      "info"
    )
    .default("medium"),

  enabled: Joi.boolean()
    .default(true)
});

export const reviewInputSchema = Joi.object({
  source: Joi.string()
    .valid("paste", "upload")
    .required(),

  code: Joi.string()
    .allow("")
    .max(2000000),

  fileName: Joi.string()
    .trim()
    .max(255),

  language: Joi.string()
    .trim()
    .lowercase()
    .max(50),

  companyRules: Joi.array()
    .items(companyRuleSchema)
    .max(100)
    .default([])
})
  .custom((value, helpers) => {
    if (
      value.source === "paste" &&
      (!value.code || value.code.length === 0)
    ) {
      return helpers.error(
        "any.custom",
        {
          message:
            "Source code is required when source is paste."
        }
      );
    }

    if (
      value.source === "upload" &&
      !value.fileName
    ) {
      return helpers.error(
        "any.custom",
        {
          message:
            "fileName is required when source is upload."
        }
      );
    }

    return value;
  })
  .messages({
    "any.custom": "{{#message}}"
  })
  .options({
    abortEarly: false,
    stripUnknown: true
  });