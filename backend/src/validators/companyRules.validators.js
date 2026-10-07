import Joi from "joi";

const VALID_CATEGORIES = [
  "security",
  "bug",
  "quality",
  "performance",
  "custom",
];

const VALID_SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
];

export const createCompanyRuleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      "string.empty": "Rule name is required",
      "string.min": "Rule name must be at least 2 characters",
      "string.max": "Rule name cannot exceed 200 characters",
      "any.required": "Rule name is required",
    }),

  category: Joi.string()
    .valid(...VALID_CATEGORIES)
    .required()
    .messages({
      "any.only": `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      "any.required": "Category is required",
    }),

  description: Joi.string()
    .trim()
    .min(3)
    .max(5000)
    .required()
    .messages({
      "string.empty": "Description is required",
      "string.min": "Description must be at least 3 characters",
      "string.max": "Description cannot exceed 5000 characters",
      "any.required": "Description is required",
    }),

  ruleText: Joi.string()
    .trim()
    .min(2)
    .max(10000)
    .required()
    .messages({
      "string.empty": "Rule text is required",
      "string.min": "Rule text must be at least 2 characters",
      "string.max": "Rule text cannot exceed 10000 characters",
      "any.required": "Rule text is required",
    }),

  severity: Joi.string()
    .valid(...VALID_SEVERITIES)
    .required()
    .messages({
      "any.only": `Severity must be one of: ${VALID_SEVERITIES.join(", ")}`,
      "any.required": "Severity is required",
    }),

  enabled: Joi.boolean().default(true),

  company: Joi.any().strip(),
  createdBy: Joi.any().strip(),
});

export const updateCompanyRuleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .optional(),

  category: Joi.string()
    .valid(...VALID_CATEGORIES)
    .optional(),

  description: Joi.string()
    .trim()
    .min(3)
    .max(5000)
    .optional(),

  ruleText: Joi.string()
    .trim()
    .min(2)
    .max(10000)
    .optional(),

  severity: Joi.string()
    .valid(...VALID_SEVERITIES)
    .optional(),

  enabled: Joi.boolean().optional(),

  company: Joi.any().strip(),
  createdBy: Joi.any().strip(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });
