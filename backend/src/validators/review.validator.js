import Joi from "joi";

const companyRuleSchema = Joi.object({
  id: Joi.string()
    .trim()
    .max(100)
    .required(),

  title: Joi.string()
    .trim()
    .max(300)
    .required(),

  description: Joi.string()
    .trim()
    .max(2000)
    .allow("")
    .default(""),

  type: Joi.string()
    .valid(
      "pattern",
      "forbidden-pattern",
      "required-pattern",
      "naming",
      "architecture"
    )
    .default("pattern"),

  severity: Joi.string()
    .valid(
      "critical",
      "high",
      "medium",
      "low",
      "info"
    )
    .default("medium"),

  pattern: Joi.string()
    .trim()
    .max(1000)
    .allow(null, "")
    .default(null),

  required: Joi.boolean()
    .default(false),

  recommendation: Joi.string()
    .trim()
    .max(2000)
    .allow("")
    .default(""),

  languages: Joi.array()
    .items(
      Joi.string()
        .trim()
        .max(50)
    )
    .max(20)
    .default([]),

  enabled: Joi.boolean()
    .default(true)
});

export const reviewInputSchema =
  Joi.object({
    code: Joi.string()
      .max(2_000_000)
      .allow(""),

    fileName: Joi.string()
      .trim()
      .max(255)
      .allow(""),

    language: Joi.string()
      .trim()
      .max(50)
      .allow(""),

    companyRules: Joi.array()
      .items(companyRuleSchema)
      .max(100)
      .default([])
  })
  .custom(
    (value, helpers) => {
      const hasCode =
        typeof value.code ===
          "string" &&
        value.code.trim()
          .length > 0;

      const hasFile =
        typeof value.fileName ===
          "string" &&
        value.fileName.trim()
          .length > 0;

      if (
        !hasCode &&
        !hasFile
      ) {
        return helpers.error(
          "any.custom",
          {
            message:
              "Provide source code or upload a source file."
          }
        );
      }

      return value;
    }
  )
  .messages({
    "any.custom":
      "{{#message}}"
  });

export const reviewRequestSchema =
  reviewInputSchema;