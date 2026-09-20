
export function buildCodeImprovementPrompt(
  context
) {
  return `
Review the supplied source code for practical improvements.

Do not invent missing project requirements.

Focus on:
- readability
- maintainability
- correctness
- security
- performance
- unnecessary complexity

Do not execute the code.

Return JSON only:

{
  "recommendations": [
    "..."
  ]
}

Language:
${context.language || "unknown"}

Source:
${context.source}
`;
}