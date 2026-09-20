
export function buildFindingAnalysisPrompt(
  finding
) {
  return `
Analyze the following static-analysis finding.

You are assisting a professional code review platform.

IMPORTANT:
- Do not invent evidence.
- Do not change the finding severity.
- Do not claim that a vulnerability was verified if it was only statically detected.
- Use only the supplied source and evidence.
- Explain uncertainty when the static evidence is incomplete.
- Return valid JSON only.

Finding:
${JSON.stringify(
  finding,
  null,
  2
)}

Return:

{
  "findingFingerprint": "...",
  "explanation": "...",
  "impact": "...",
  "fix": "...",
  "improvedCode": "...",
  "securityExplanation": "..."
}
`;
}