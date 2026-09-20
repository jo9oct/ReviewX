
export function buildSecurityReviewPrompt(
  context
) {
  return `
Provide a security explanation for the supplied static-analysis findings.

The deterministic analyzer is the source of truth for detected findings.

Do not:
- invent vulnerabilities
- invent evidence
- change severity
- mark findings as verified
- claim runtime exploitation

Use the supplied evidence only.

Return JSON only:

{
  "recommendations": [
    "..."
  ]
}

Language:
${context.language || "unknown"}

Findings:
${JSON.stringify(
  context.findings,
  null,
  2
)}
`;
}