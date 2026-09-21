import Joi from "joi";

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
      .allow("")
  })
    .custom(
      (value, helpers) => {
        const hasCode =
          typeof value.code === "string" &&
          value.code.trim().length > 0;

        const hasFileName =
          typeof value.fileName === "string" &&
          value.fileName.trim().length > 0;

        if (
          !hasCode &&
          !hasFileName
        ) {
          return helpers.error(
            "any.custom"
          );
        }

        return value;
      }
    )
    .messages({
      "any.custom":
        "Provide source code or a source file."
    });

export const reviewRequestSchema =
  reviewInputSchema;