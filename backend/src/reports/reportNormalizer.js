const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeFinding = (finding) => ({
  id: finding?.id || finding?._id || null,
  ruleId: normalizeString(finding?.ruleId),
  category: normalizeString(finding?.category),
  title: normalizeString(finding?.title),
  description: normalizeString(finding?.description),
  severity: normalizeString(finding?.severity),
  confidence: normalizeString(finding?.confidence),
  status: normalizeString(finding?.status),
  filePath: normalizeString(finding?.filePath),
  location: finding?.location || null,
  evidence: finding?.evidence || null,
  remediation: finding?.remediation || null,
  metadata: finding?.metadata || {},
});

const normalizeAiAnalysis = (aiAnalysis) => {
  if (!aiAnalysis || typeof aiAnalysis !== "object") {
    return null;
  }

  return {
    enabled: Boolean(aiAnalysis.enabled),
    provider: aiAnalysis.provider || null,
    status: aiAnalysis.status || null,
    summary: aiAnalysis.summary || null,
    findings: Array.isArray(aiAnalysis.findings)
      ? aiAnalysis.findings
      : [],
    securityReview: aiAnalysis.securityReview || null,
    codeImprovements: Array.isArray(aiAnalysis.codeImprovements)
      ? aiAnalysis.codeImprovements
      : [],
  };
};

export const normalizeReport = ({
  review,
  project,
  findings = [],
  score,
  aiAnalysis = null,
  summary,
}) => ({
  reportVersion: "1.0",
  generatedAt: new Date().toISOString(),

  review: {
    id: review?.id || review?._id || null,
    status: review?.status || null,
    createdAt: review?.createdAt || null,
    completedAt: review?.completedAt || null,
  },

  project: {
    id: project?.id || project?._id || null,
    name: project?.name || project?.projectName || null,
    sourceType: project?.sourceType || null,
  },

  summary: summary || null,

  score: score || null,

  findings: Array.isArray(findings)
    ? findings.map(normalizeFinding)
    : [],

  aiAnalysis: normalizeAiAnalysis(aiAnalysis),
});