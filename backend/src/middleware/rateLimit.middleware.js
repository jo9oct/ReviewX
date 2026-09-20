import {
  RateLimitError
} from "../utils/errors.js";

import {
  env
} from "../config/env.js";

const clients =
  new Map();

function getClientKey(
  req
) {
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function cleanupExpired(
  now
) {
  for (
    const [
      key,
      entry
    ] of clients.entries()
  ) {
    if (
      entry.resetAt <= now
    ) {
      clients.delete(
        key
      );
    }
  }
}

export function rateLimit(
  req,
  res,
  next
) {
  const now =
    Date.now();

  cleanupExpired(
    now
  );

  const key =
    getClientKey(
      req
    );

  let entry =
    clients.get(
      key
    );

  if (!entry) {
    entry = {
      count: 0,

      resetAt:
        now +
        env.rateLimit
          .windowMs
    };

    clients.set(
      key,
      entry
    );
  }

  if (
    entry.count >=
    env.rateLimit.maxRequests
  ) {
    const retryAfter =
      Math.ceil(
        (
          entry.resetAt -
          now
        ) / 1000
      );

    res.setHeader(
      "Retry-After",
      String(
        retryAfter
      )
    );

    return next(
      new RateLimitError(
        "Too many requests. Please try again later."
      )
    );
  }

  entry.count += 1;

  res.setHeader(
    "X-RateLimit-Limit",
    String(
      env.rateLimit
        .maxRequests
    )
  );

  res.setHeader(
    "X-RateLimit-Remaining",
    String(
      Math.max(
        0,
        env.rateLimit
          .maxRequests -
          entry.count
      )
    )
  );

  res.setHeader(
    "X-RateLimit-Reset",
    String(
      Math.ceil(
        entry.resetAt / 1000
      )
    )
  );

  next();
}