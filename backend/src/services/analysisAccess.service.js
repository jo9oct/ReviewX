import {
  BadRequestError,
  ForbiddenError
} from "../utils/errors.js";

const DEFAULT_ACCESS = Object.freeze({
  plan: "standard",

  limits: Object.freeze({
    maxSourceSize: 2000000,
    maxAiFindings: 20
  }),

  features: Object.freeze({
    ai: false,
    pdf: true
  })
});

function positiveInteger(
  value,
  fallback
) {
  if (
    Number.isInteger(value) &&
    value >= 0
  ) {
    return value;
  }

  return fallback;
}

export function normalizeAccess(
  access = {}
) {
  if (
    access === null ||
    access === undefined
  ) {
    return DEFAULT_ACCESS;
  }

  if (
    typeof access !== "object" ||
    Array.isArray(access)
  ) {
    throw new BadRequestError(
      "Invalid analysis access context."
    );
  }

  const limits =
    access.limits || {};

  const features =
    access.features || {};

  return Object.freeze({
    plan:
      typeof access.plan === "string"
        ? access.plan
        : DEFAULT_ACCESS.plan,

    limits: Object.freeze({
      maxSourceSize:
        positiveInteger(
          limits.maxSourceSize,
          DEFAULT_ACCESS.limits.maxSourceSize
        ),

      maxAiFindings:
        positiveInteger(
          limits.maxAiFindings,
          DEFAULT_ACCESS.limits.maxAiFindings
        )
    }),

    features: Object.freeze({
      ai:
        typeof features.ai === "boolean"
          ? features.ai
          : DEFAULT_ACCESS.features.ai,

      pdf:
        typeof features.pdf === "boolean"
          ? features.pdf
          : DEFAULT_ACCESS.features.pdf
    })
  });
}

export async function getAnalysisAccess(
  accessContext = null
) {
  if (
    accessContext === null ||
    accessContext === undefined
  ) {
    return DEFAULT_ACCESS;
  }

  return normalizeAccess(
    accessContext
  );
}

export function assertSourceSize(
  access,
  sourceSize
) {
  const normalized =
    normalizeAccess(access);

  if (
    !Number.isInteger(sourceSize) ||
    sourceSize < 0
  ) {
    throw new BadRequestError(
      "Invalid source size."
    );
  }

  if (
    sourceSize >
    normalized.limits.maxSourceSize
  ) {
    throw new ForbiddenError(
      "Source code exceeds the allowed analysis size."
    );
  }

  return true;
}

export function assertAiAccess(
  access
) {
  const normalized =
    normalizeAccess(access);

  if (
    !normalized.features.ai
  ) {
    throw new ForbiddenError(
      "AI-assisted analysis is not available for the current access level."
    );
  }

  return true;
}

export function assertPdfAccess(
  access
) {
  const normalized =
    normalizeAccess(access);

  if (
    !normalized.features.pdf
  ) {
    throw new ForbiddenError(
      "PDF reports are not available for the current access level."
    );
  }

  return true;
}

export function getMaxAiFindings(
  access
) {
  const normalized =
    normalizeAccess(access);

  return normalized.limits.maxAiFindings;
}