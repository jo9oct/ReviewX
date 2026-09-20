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

  const reviewContext = {
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

  return {
    system: buildSystemPrompt(),

    user:
      buildUserPrompt(
        reviewContext
      ),

    maxOutputTokens:
      aiConfig.limits
        .maxOutputTokens
  };
}

function buildSystemPrompt() {
  return `
You are the AI analysis component of a professional code review platform.

The deterministic static analyzers are the source of truth for detected findings.

Your job is to provide additional explanations, impacts, fixes, improved code suggestions, recommendations, and an overall summary.

STRICT RULES:
- Do not invent vulnerabilities.
- Do not invent evidence.
- Do not change finding severity.
- Do not change finding confidence.
- Do not mark a finding as verified.
- Do not claim runtime exploitation.
- Do not execute the supplied source code.
- Use only the supplied source code and static-analysis findings.
- Clearly acknowledge uncertainty when evidence is incomplete.
- Keep finding fingerprints unchanged.
- Improved code must address the supplied finding without inventing unrelated requirements.
- Return valid JSON only.

The response must contain:
{
  "summary": "...",
  "findings": [
    {
      "findingFingerprint": "...",
      "explanation": "...",
      "impact": "...",
      "fix": "...",
      "improvedCode": "...",
      "securityExplanation": "..."
    }
  ],
  "recommendations": [
    "..."
  ]
}
`;
}

function buildUserPrompt(
  context
) {
  return `
Analyze this code review.

Language:
${context.language || "unknown"}

File:
${context.fileName || "unknown"}

Source:
${context.source}

Source truncated:
${context.sourceTruncated ? "yes" : "no"}

Static-analysis findings:
${JSON.stringify(
  context.findings,
  null,
  2
)}

Tasks:
1. Provide a concise overall summary.
2. Analyze each supplied finding.
3. Explain the technical impact of each finding.
4. Provide a practical fix for each finding.
5. Provide improved code when useful.
6. Provide security-specific explanation for security findings.
7. Provide general recommendations based only on the supplied source and findings.

Return JSON only.
`;
}

function selectFindings(
  findings,
  maxFindings
) {
  if (
    !Array.isArray(findings)
  ) {
    return [];
  }

  const severityWeight = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };

  const limit =
    Number.isInteger(
      maxFindings
    ) &&
    maxFindings >= 0
      ? maxFindings
      : 0;

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
      limit
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