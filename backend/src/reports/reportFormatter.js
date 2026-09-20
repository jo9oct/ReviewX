
export function formatReport({
  review,
  findings = [],
  score = null,
  aiAnalysis = null
}) {
  return {
    reportVersion: "1.0",
    generatedAt:
      new Date().toISOString(),

    review: {
      id:
        review?._id ||
        review?.id ||
        null,

      fileName:
        review?.fileName ||
        null,

      language:
        review?.language ||
        null,

      fileExtension:
        review?.fileExtension ||
        null,

      sourceSize:
        review?.sourceSize ||
        0,

      status:
        review?.status ||
        null
    },

    summary: {
      totalFindings:
        findings.length,

      critical:
        countSeverity(
          findings,
          "critical"
        ),

      high:
        countSeverity(
          findings,
          "high"
        ),

      medium:
        countSeverity(
          findings,
          "medium"
        ),

      low:
        countSeverity(
          findings,
          "low"
        ),

      info:
        countSeverity(
          findings,
          "info"
        )
    },

    score:
      score || null,

    findings:
      findings.map(
        formatFinding
      ),

    aiAnalysis:
      formatAIAnalysis(
        aiAnalysis
      )
  };
}

function formatFinding(
  finding
) {
  return {
    id:
      finding._id ||
      finding.id ||
      null,

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

    status:
      finding.status,

    file:
      finding.file,

    line:
      finding.line,

    column:
      finding.column,

    code:
      finding.code,

    evidence:
      finding.evidence || [],

    recommendation:
      finding.recommendation,

    analyzer:
      finding.analyzer
  };
}

function formatAIAnalysis(
  aiAnalysis
) {
  if (!aiAnalysis) {
    return null;
  }

  return {
    status:
      aiAnalysis.status ||
      null,

    provider:
      aiAnalysis.provider ||
      null,

    model:
      aiAnalysis.model ||
      null,

    summary:
      aiAnalysis.summary ||
      null,

    findings:
      aiAnalysis.findings ||
      [],

    recommendations:
      aiAnalysis.recommendations ||
      []
  };
}

function countSeverity(
  findings,
  severity
) {
  return findings.filter(
    (finding) =>
      finding.severity ===
      severity
  ).length;
}