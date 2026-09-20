import {
  securityConfig
} from "../config/security.js";

import {
  BadRequestError
} from "../utils/errors.js";

const allowedMethods =
  new Set(
    securityConfig.allowedMethods
  );

export function security(
  req,
  res,
  next
) {
  for (
    const [
      header,
      value
    ] of Object.entries(
      securityConfig
        .securityHeaders
    )
  ) {
    res.setHeader(
      header,
      value
    );
  }

  res.setHeader(
    "X-Permitted-Cross-Domain-Policies",
    "none"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  if (
    !allowedMethods.has(
      req.method
    )
  ) {
    return next(
      new BadRequestError(
        `HTTP method ${req.method} is not allowed.`
      )
    );
  }

  next();
}