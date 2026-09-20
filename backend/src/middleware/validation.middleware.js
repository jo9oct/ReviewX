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

export function validateReviewInput(schema) {
  return (req, _res, next) => {
    console.log("UPLOAD DEBUG:", {
      body: req.body,
      file: req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
          }
        : null
    });

    const input = {
      ...req.body
    };

    if (req.file) {
      input.fileName =
        req.file.originalname;

      input.code =
        "__uploaded_source_file__";
    }

    const {
      error,
      value
    } = schema.validate(input, {
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

    if (
      req.file &&
      req.body.code ===
        "__uploaded_source_file__"
    ) {
      delete req.body.code;
    }

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