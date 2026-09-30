const codeImprovementPrompt = ({
  findings,
  files
}) => {
  return `
Provide conservative code-improvement guidance based only on
the supplied deterministic findings.

Do not invent missing project requirements.
Do not claim that proposed changes were tested.
Do not claim that a fix has been applied.

Return JSON only:

{
  "improvements": [
    {
      "ruleId": "existing rule id",
      "suggestion": "specific improvement",
      "reason": "why it addresses the finding"
    }
  ]
}

Findings:
${JSON.stringify(findings, null, 2)}

Source:
${JSON.stringify(files, null, 2)}
`.trim();
};

export default codeImprovementPrompt;