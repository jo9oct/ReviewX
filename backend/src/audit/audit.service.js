const SENSITIVE_KEYS = new Set([
  "password",
  "passwd",
  "secret",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "apiKey",
  "apiSecret",
  "privateKey",
  "source",
  "content",
]);

const sanitizeValue = (
  value,
  depth = 0,
) => {
  if (depth > 4) {
    return "[truncated]";
  }

  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    return value.length > 500
      ? `${value.slice(0, 500)}...[truncated]`
      : value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) =>
        sanitizeValue(
          item,
          depth + 1,
        ),
      );
  }

  if (
    typeof value === "object"
  ) {
    const result = {};

    for (const [
      key,
      nestedValue,
    ] of Object.entries(value)) {
      if (
        SENSITIVE_KEYS.has(key)
      ) {
        result[key] =
          "[redacted]";
        continue;
      }

      result[key] =
        sanitizeValue(
          nestedValue,
          depth + 1,
        );
    }

    return result;
  }

  return "[unsupported]";
};

export const createAuditService = ({
  auditLogRepository,
}) => {
  if (
    !auditLogRepository ||
    typeof auditLogRepository.create !==
      "function"
  ) {
    throw new TypeError(
      "Audit log repository is required.",
    );
  }

  return {
    async record({
      action,
      actorId = null,
      resourceType = null,
      resourceId = null,
      status = "success",
      metadata = {},
      ipAddress = null,
      userAgent = null,
    }) {
      return auditLogRepository.create({
        action,
        actorId,
        resourceType,
        resourceId,
        status,
        metadata:
          sanitizeValue(metadata),
        ipAddress,
        userAgent,
        createdAt: new Date(),
      });
    },
  };
};