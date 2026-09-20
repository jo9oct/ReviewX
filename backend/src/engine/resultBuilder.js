export function buildResult({
  context,
  findings,
  score,
  aiAnalysis = null
}) {
  const normalizedFindings =
    Array.isArray(findings)
      ? findings
      : [];

  return {
    review: {
      fileName:
        context.fileName || null,

      language:
        context.language || null,

      fileExtension:
        context.fileExtension || null,

      sourceSize:
        context.sourceSize ??
        context.code?.length ??
        0
    },

    status: "completed",

    summary: {
      totalFindings:
        normalizedFindings.length,

      critical:
        countBySeverity(
          normalizedFindings,
          "critical"
        ),

      high:
        countBySeverity(
          normalizedFindings,
          "high"
        ),

      medium:
        countBySeverity(
          normalizedFindings,
          "medium"
        ),

      low:
        countBySeverity(
          normalizedFindings,
          "low"
        ),

      info:
        countBySeverity(
          normalizedFindings,
          "info"
        )
    },

    score,

    findings:
      normalizedFindings,

    aiAnalysis,

    metadata: {
      analyzerVersion:
        "1.0.0",

      generatedAt:
        new Date().toISOString()
    }
  };
}

function countBySeverity(
  findings,
  severity
) {
  return findings.filter(
    (finding) =>
      finding.severity ===
      severity
  ).length;
}