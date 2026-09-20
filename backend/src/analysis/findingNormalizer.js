
import {
  createFinding
} from "./findingFactory.js";

const SEVERITY_ORDER = Object.freeze({
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
});

const CONFIDENCE_ORDER =
  Object.freeze({
    high: 3,
    medium: 2,
    low: 1
  });

export function normalizeFinding(
  finding
) {
  return createFinding({
    ...finding,

    category:
      normalizeText(
        finding.category
      ),

    type:
      normalizeText(
        finding.type
      ),

    ruleId:
      normalizeText(
        finding.ruleId
      ),

    title:
      normalizeText(
        finding.title
      ),

    description:
      normalizeText(
        finding.description
      ),

    severity:
      normalizeSeverity(
        finding.severity
      ),

    confidence:
      normalizeConfidence(
        finding.confidence
      ),

    status:
      normalizeStatus(
        finding.status
      ),

    analyzer:
      normalizeText(
        finding.analyzer
      ),

    file:
      normalizeOptionalText(
        finding.file
      ),

    code:
      normalizeCode(
        finding.code
      ),

    recommendation:
      normalizeOptionalText(
        finding.recommendation
      ),

    evidence:
      normalizeEvidence(
        finding.evidence
      )
  });
}

export function normalizeFindings(
  findings
) {
  if (!Array.isArray(findings)) {
    return [];
  }

  return findings.map(
    normalizeFinding
  );
}

export function compareFindingSeverity(
  first,
  second
) {
  return (
    SEVERITY_ORDER[
      first.severity
    ] -
    SEVERITY_ORDER[
      second.severity
    ]
  );
}

export function compareFindingConfidence(
  first,
  second
) {
  return (
    CONFIDENCE_ORDER[
      first.confidence
    ] -
    CONFIDENCE_ORDER[
      second.confidence
    ]
  );
}

function normalizeSeverity(
  value
) {
  const normalized =
    normalizeText(value);

  return SEVERITY_ORDER[
    normalized
  ]
    ? normalized
    : "medium";
}

function normalizeConfidence(
  value
) {
  const normalized =
    normalizeText(value);

  return CONFIDENCE_ORDER[
    normalized
  ]
    ? normalized
    : "medium";
}

function normalizeStatus(
  value
) {
  const allowed = new Set([
    "detected",
    "verified",
    "false_positive",
    "accepted",
    "resolved"
  ]);

  const normalized =
    normalizeText(value);

  return allowed.has(normalized)
    ? normalized
    : "detected";
}

function normalizeEvidence(
  evidence
) {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .filter(
      (item) =>
        item &&
        typeof item === "object"
    )
    .map((item) => ({
      type:
        normalizeText(item.type),

      file:
        normalizeOptionalText(
          item.file
        ),

      line:
        normalizePosition(
          item.line
        ),

      column:
        normalizePosition(
          item.column
        ),

      code:
        normalizeCode(
          item.code
        ),

      description:
        normalizeText(
          item.description
        )
    }));
}

function normalizeText(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeOptionalText(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return normalizeText(value);
}

function normalizeCode(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function normalizePosition(
  value
) {
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