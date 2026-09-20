import crypto from "node:crypto";

export function requestId(
  req,
  res,
  next
) {
  const incomingId =
    req.get(
      "X-Request-ID"
    );

  const requestId =
    incomingId &&
    incomingId.length <= 128
      ? incomingId
      : crypto.randomUUID();

  req.requestId =
    requestId;

  res.setHeader(
    "X-Request-ID",
    requestId
  );

  next();
}