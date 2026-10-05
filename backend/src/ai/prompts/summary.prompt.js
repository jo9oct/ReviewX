const summaryPrompt = ({
  findings,
  score
}) => {
  return `
Summarize the supplied static code review.

Use only the provided findings and score.

Do not introduce new vulnerabilities,
dependencies, versions, CVEs, tests,
execution results, or unsupported facts.

Return JSON only:

{
  "summary": "concise review summary",
  "riskAreas": [
    "existing risk area"
  ],
  "priorities": [
    "existing finding that should be reviewed"
  ]
}

Score:
${JSON.stringify(score, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}
`.trim();
};

export default summaryPrompt;