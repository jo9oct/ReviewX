import Joi from "joi";

const findingAnalysis =
  Joi.object({
    findingFingerprint:
      Joi.string()
        .required(),

    explanation:
      Joi.string()
        .max(10000)
        .required(),

    impact:
      Joi.string()
        .max(5000)
        .required(),

    fix:
      Joi.string()
        .max(10000)
        .required(),

    improvedCode:
      Joi.string()
        .allow("")
        .max(30000)
        .required(),

    securityExplanation:
      Joi.string()
        .allow("")
        .max(10000)
        .default("")
  });

export const aiResponseSchema =
  Joi.object({
    summary:
      Joi.string()
        .max(10000)
        .required(),

    findings:
      Joi.array()
        .items(
          findingAnalysis
        )
        .required(),

    recommendations:
      Joi.array()
        .items(
          Joi.string()
            .max(2000)
        )
        .max(20)
        .required()
  });

export function validateAIResponse(
  response
) {
  const {
    error,
    value
  } =
    aiResponseSchema.validate(
      response,
      {
        abortEarly: false,
        stripUnknown: true
      }
    );

  return {
    valid:
      !error,

    value,

    error:
      error || null
  };
}