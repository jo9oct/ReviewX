
import {
  aiConfig
} from "../config/ai.js";

export function buildAIContext({
  context,
  findings,
  maxFindings =
    aiConfig.limits.maxFindings,
  maxInputChars =
    aiConfig.limits.maxInputChars
}) {
  const selectedFindings =
    selectFindings(
      findings,
      maxFindings
    );

  const source =
    typeof context?.code ===
    "string"
      ? context.code
      : "";

  const trimmedSource =
    source.slice(
      0,
      maxInputChars
    );

  return {
    language:
      context?.language ||
      null,

    fileName:
      context?.fileName ||
      null,

    source:
      trimmedSource,

    sourceTruncated:
      source.length >
      trimmedSource.length,

    findings:
      selectedFindings.map(
        serializeFinding
      )
  };
}

function selectFindings(
  findings,
  maxFindings
) {
  if (!Array.isArray(findings)) {
    return [];
  }

  const severityWeight = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };

  return [...findings]
    .sort(
      (a, b) =>
        (
          severityWeight[
            b.severity
          ] || 0
        ) -
        (
          severityWeight[
            a.severity
          ] || 0
        )
    )
    .slice(
      0,
      maxFindings
    );
}

function serializeFinding(
  finding
) {
  return {
    fingerprint:
      finding.fingerprint,

    category:
      finding.category,

    type:
      finding.type,

    ruleId:
      finding.ruleId,

    title:
      finding.title,

    description:
      finding.description,

    severity:
      finding.severity,

    confidence:
      finding.confidence,

    file:
      finding.file,

    line:
      finding.line,

    code:
      finding.code,

    evidence:
      Array.isArray(
        finding.evidence
      )
        ? finding.evidence
        : [],

    recommendation:
      finding.recommendation
  };
}