
import {
  normalizeFindings
} from "./findingNormalizer.js";

const CATEGORIES = Object.freeze([
  "security",
  "bug",
  "quality",
  "performance"
]);

export function createAnalysisResult({
  reviewId = null,
  language,
  findings = [],
  metadata = {}
}) {
  const normalizedFindings =
    normalizeFindings(findings);

  const counts =
    calculateCounts(
      normalizedFindings
    );

  return Object.freeze({
    reviewId,

    language,

    findings:
      normalizedFindings,

    findingCount:
      normalizedFindings.length,

    counts,

    metadata: {
      ...metadata
    }
  });
}

export function mergeAnalysisResults(
  results
) {
  if (!Array.isArray(results)) {
    return createAnalysisResult({
      findings: []
    });
  }

  const findings =
    results.flatMap(
      (result) =>
        Array.isArray(
          result?.findings
        )
          ? result.findings
          : []
    );

  const firstResult =
    results.find(
      (result) => result
    );

  return createAnalysisResult({
    reviewId:
      firstResult?.reviewId ||
      null,

    language:
      firstResult?.language ||
      null,

    findings
  });
}

function calculateCounts(
  findings
) {
  const result = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,

    security: 0,
    bug: 0,
    quality: 0,
    performance: 0
  };

  for (const finding of findings) {
    if (
      Object.hasOwn(
        result,
        finding.severity
      )
    ) {
      result[finding.severity] += 1;
    }

    if (
      CATEGORIES.includes(
        finding.category
      )
    ) {
      result[finding.category] += 1;
    }
  }

  return Object.freeze(result);
}