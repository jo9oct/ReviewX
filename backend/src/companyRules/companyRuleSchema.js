import Joi from 'joi';

const companyRuleSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(/^[a-z0-9._-]+$/)
    .required(),

  name: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required(),

  description: Joi.string()
    .trim()
    .min(1)
    .max(5000)
    .required(),

  category: Joi.string()
    .valid(
      'architecture',
      'security',
      'bug',
      'quality',
      'performance',
      'style'
    )
    .required(),

  severity: Joi.string()
    .valid('critical', 'high', 'medium', 'low', 'info')
    .required(),

  confidence: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium'),

  languages: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(50)
    )
    .min(1)
    .required(),

  enabled: Joi.boolean()
    .default(true),

  matcher: Joi.object({
    type: Joi.string()
      .valid('text', 'regex')
      .required(),

    pattern: Joi.string()
      .min(1)
      .max(2000)
      .required(),

    flags: Joi.string()
      .pattern(/^[dgimsuvy]*$/u)
      .default('gu')
  }).required(),

  remediation: Joi.string()
    .trim()
    .max(5000)
    .optional()
}).required();

const validateCompanyRule = (rule) => {
  return companyRuleSchema.validate(rule, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false
  });
};

export {
  companyRuleSchema,
  validateCompanyRule
};