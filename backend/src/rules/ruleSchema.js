import Joi from 'joi';

const severitySchema = Joi.string()
  .valid('critical', 'high', 'medium', 'low', 'info')
  .required();

const confidenceSchema = Joi.string()
  .valid('low', 'medium', 'high')
  .required();

const categorySchema = Joi.string()
  .valid('security', 'bug', 'quality', 'performance')
  .required();

const ruleDefinitionSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(/^[a-z0-9._-]+$/)
    .required(),

  category: categorySchema,

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

  severity: severitySchema,

  confidence: confidenceSchema,

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

  check: Joi.function()
    .arity(1)
    .required()
}).required();

const validateRuleDefinition = (definition) => {
  return ruleDefinitionSchema.validate(definition, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false
  });
};

const assertRuleDefinition = (definition) => {
  const { error, value } = validateRuleDefinition(definition);

  if (error) {
    throw new TypeError(
      `Invalid rule definition: ${error.details
        .map((detail) => detail.message)
        .join('; ')}`
    );
  }

  return value;
};

export {
  ruleDefinitionSchema,
  validateRuleDefinition,
  assertRuleDefinition
};