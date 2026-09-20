
import Joi from "joi";

const severityValues = [
  "critical",
  "high",
  "medium",
  "low",
  "info"
];

const confidenceValues = [
  "low",
  "medium",
  "high"
];

const statusValues = [
  "detected",
  "verified",
  "false_positive",
  "accepted",
  "resolved"
];

export const findingSchema = Joi.object({
  category: Joi.string()
    .valid(
      "security",
      "bug",
      "quality",
      "performance"
    )
    .required(),

  type: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required(),

  ruleId: Joi.string()
    .trim()
    .min(1)
    .max(150)
    .required(),

  title: Joi.string()
    .trim()
    .min(1)
    .max(300)
    .required(),

  description: Joi.string()
    .trim()
    .min(1)
    .max(5000)
    .required(),

  severity: Joi.string()
    .valid(...severityValues)
    .required(),

  confidence: Joi.string()
    .valid(...confidenceValues)
    .required(),

  status: Joi.string()
    .valid(...statusValues)
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

  evidence: Joi.array()
    .items(
      Joi.object({
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
          .max(5000)
          .required()
      })
    )
    .default([]),

  recommendation: Joi.string()
    .trim()
    .max(5000)
    .allow(null, "")
    .default(null),

  analyzer: Joi.string()
    .trim()
    .min(1)
    .max(150)
    .required(),

  fingerprint: Joi.string()
    .trim()
    .max(128)
    .allow(null, "")
    .default(null)
}).options({
  abortEarly: false,
  stripUnknown: true
});