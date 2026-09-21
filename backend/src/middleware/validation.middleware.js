import { BadRequestError } from "../utils/errors.js";

function formatValidationDetails(error) {
  return error.details.map((detail) => ({
    field: detail.path.join("."),
    message: detail.message
  }));
}

export function validateBody(schema) {
  return (req, _res, next) => {
    const {
      error,
      value
    } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return next(
        new BadRequestError(
          "Request validation failed.",
          formatValidationDetails(error)
        )
      );
    }

    req.body = value;

    next();
  };
}

export function validateReviewInput(
  schema
) {
  return (req, _res, next) => {
    const hasFile =
      Boolean(req.file);

    const hasCode =
      typeof req.body?.code === "string" &&
      req.body.code.trim().length > 0;

    if (
      hasFile &&
      hasCode
    ) {
      return next(
        new BadRequestError(
          "Provide either pasted source code or a source file, not both."
        )
      );
    }

    if (
      !hasFile &&
      !hasCode
    ) {
      return next(
        new BadRequestError(
          "Provide source code or upload a source file."
        )
      );
    }

    const input = {
      ...req.body
    };

    if (hasFile) {
      input.fileName =
        req.file.originalname;
    }

    const {
      error,
      value
    } = schema.validate(
      input,
      {
        abortEarly: false,
        stripUnknown: true
      }
    );

    if (error) {
      return next(
        new BadRequestError(
          "Request validation failed.",
          formatValidationDetails(error)
        )
      );
    }

    req.body = value;

    next();
  };
}

export function validateParams(schema) {
  return (req, _res, next) => {
    const {
      error,
      value
    } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return next(
        new BadRequestError(
          "Route parameter validation failed.",
          formatValidationDetails(error)
        )
      );
    }

    req.params = value;

    next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const {
      error,
      value
    } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return next(
        new BadRequestError(
          "Query validation failed.",
          formatValidationDetails(error)
        )
      );
    }

    req.query = value;

    next();
  };
}