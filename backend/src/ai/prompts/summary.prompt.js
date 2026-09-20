
export function buildSummaryPrompt(
  context
) {
  return `
Create a concise professional code-review summary.

Base the summary only on the supplied findings.

Do not:
- invent findings
- invent evidence
- change severity
- claim vulnerabilities were verified
- execute or assume execution of the source code

Return JSON only:

{
  "summary": "..."
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