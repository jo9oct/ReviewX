export const SOURCE_EXTENSIONS =
  Object.freeze([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".cs",
    ".php",
    ".c",
    ".cpp",
    ".html",
    ".css",
    ".sql"
  ]);

export const REVIEW_STATUSES =
  Object.freeze([
    "pending",
    "running",
    "completed",
    "failed",
    "cancelled"
  ]);

export const FINDING_CATEGORIES =
  Object.freeze([
    "security",
    "bug",
    "quality",
    "performance"
  ]);

export const FINDING_SEVERITIES =
  Object.freeze([
    "critical",
    "high",
    "medium",
    "low",
    "info"
  ]);

export const FINDING_CONFIDENCE =
  Object.freeze([
    "low",
    "medium",
    "high"
  ]);

export const FINDING_STATUSES =
  Object.freeze([
    "detected",
    "verified",
    "false_positive",
    "accepted",
    "resolved"
  ]);

export const EVIDENCE_TYPES =
  Object.freeze([
    "source",
    "pattern",
    "rule",
    "context"
  ]);

export const ANALYSIS_CATEGORIES =
  Object.freeze([
    "security",
    "bug",
    "quality",
    "performance"
  ]);

export const MAX_FINDING_TITLE_LENGTH =
  300;

export const MAX_FINDING_DESCRIPTION_LENGTH =
  5000;

export const MAX_FINDING_CODE_LENGTH =
  10000;

export const MAX_FINDING_EVIDENCE_LENGTH =
  10000;