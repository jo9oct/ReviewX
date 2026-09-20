import Joi from "joi";

export const createReportSchema =
  Joi.object({
    reviewId:
      Joi.string()
        .trim()
        .required(),

    type:
      Joi.string()
        .valid(
          "json",
          "pdf"
        )
        .required()
  });

export const reportIdSchema =
  Joi.object({
    reportId:
      Joi.string()
        .trim()
        .required()
  });

export const reviewReportListSchema =
  Joi.object({
    reviewId:
      Joi.string()
        .trim()
        .required()
  });