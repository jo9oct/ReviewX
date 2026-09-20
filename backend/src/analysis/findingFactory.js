
import crypto from "node:crypto";

import {
  findingSchema
} from "../schemas/finding.schema.js";

import {
  BadRequestError
} from "../utils/errors.js";

const DEFAULT_SEVERITY =
  "medium";

const DEFAULT_CONFIDENCE =
  "medium";

const DEFAULT_STATUS =
  "detected";

export function createFinding(input) {
  const normalizedInput =
    normalizeFactoryInput(input);

  const fingerprint =
    normalizedInput.fingerprint ||
    createFindingFingerprint(
      normalizedInput
    );

  const finding = {
    ...normalizedInput,
    fingerprint
  };

  const {
    value,
    error
  } = findingSchema.validate(
    finding
  );

  if (error) {
    throw new BadRequestError(
      "Invalid analyzer finding.",
      {
        details:
          error.details.map(
            (detail) => ({
              path: detail.path,
              message: detail.message
            })
          )
      }
    );
  }

  return Object.freeze(value);
}

export function createFindingFingerprint(
  finding
) {
  const identity = [
    finding.category,
    finding.ruleId,
    finding.type,
    finding.file || "",
    finding.line || "",
    finding.column || ""
  ]
    .join("|")
    .toLowerCase();

  return crypto
    .createHash("sha256")
    .update(identity)
    .digest("hex");
}

function normalizeFactoryInput(
  input
) {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new BadRequestError(
      "Finding input must be an object."
    );
  }

  return {
    category:
      input.category,

    type:
      input.type,

    ruleId:
      input.ruleId,

    title:
      input.title,

    description:
      input.description,

    severity:
      input.severity ||
      DEFAULT_SEVERITY,

    confidence:
      input.confidence ||
      DEFAULT_CONFIDENCE,

    status:
      input.status ||
      DEFAULT_STATUS,

    file:
      input.file || null,

    line:
      normalizePosition(input.line),

    column:
      normalizePosition(input.column),

    code:
      input.code || null,

    evidence:
      Array.isArray(input.evidence)
        ? input.evidence
        : [],

    recommendation:
      input.recommendation || null,

    analyzer:
      input.analyzer,

    fingerprint:
      input.fingerprint || null
  };
}

function normalizePosition(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isInteger(number) ||
    number < 1
  ) {
    return null;
  }

  return number;
}