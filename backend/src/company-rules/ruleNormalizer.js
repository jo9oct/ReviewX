
const VALID_SEVERITIES = new Set([
  "critical",
  "high",
  "medium",
  "low",
  "info"
]);

const VALID_TYPES = new Set([
  "pattern",
  "forbidden-pattern",
  "required-pattern",
  "naming",
  "architecture"
]);

export function normalizeRules(
  rules = []
) {
  if (!Array.isArray(rules)) {
    return [];
  }

  return rules
    .map(normalizeRule)
    .filter(Boolean);
}

function normalizeRule(rule) {
  if (!rule || typeof rule !== "object") {
    return null;
  }

  const id =
    normalizeText(rule.id);

  const title =
    normalizeText(rule.title);

  const description =
    normalizeText(rule.description);

  if (!id || !title) {
    return null;
  }

  const type =
    VALID_TYPES.has(rule.type)
      ? rule.type
      : "pattern";

  const severity =
    VALID_SEVERITIES.has(
      rule.severity
    )
      ? rule.severity
      : "medium";

  const pattern =
    normalizeText(rule.pattern);

  const required =
    normalizeBoolean(
      rule.required,
      type === "required-pattern"
    );

  const enabled =
    normalizeBoolean(
      rule.enabled,
      true
    );

  return {
    id,
    title,
    description:
      description ||
      title,
    type,
    severity,
    pattern: pattern || null,
    required,
    enabled,
    recommendation:
      normalizeText(
        rule.recommendation
      ) ||
      "Update the code to comply with the company rule.",
    languages:
      normalizeLanguages(
        rule.languages
      )
  };
}

function normalizeText(value) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
}

function normalizeBoolean(
  value,
  fallback
) {
  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  return fallback;
}

function normalizeLanguages(
  languages
) {
  if (!Array.isArray(languages)) {
    return [];
  }

  return [
    ...new Set(
      languages
        .filter(
          (language) =>
            typeof language ===
            "string"
        )
        .map(
          (language) =>
            language
              .trim()
              .toLowerCase()
        )
        .filter(Boolean)
    )
  ];
}