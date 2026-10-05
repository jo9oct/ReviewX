const securityReviewPrompt = ({
  findings,
  files
}) => {
  return `
You are an AI assistant supporting a deterministic security
code-review engine.

Review only the supplied findings and source.

Do not claim that code was executed or exploited.
Do not invent CVEs, dependencies, versions, locations,
credentials, or test results.

Return JSON only:

{
  "summary": "short security summary",
  "findings": [
    {
      "ruleId": "existing rule id",
      "assessment": "confirmed|likely|uncertain|not_supported",
      "explanation": "short explanation",
      "remediation": "practical remediation"
    }
  ]
}

Existing findings:
${JSON.stringify(findings, null, 2)}

Source:
${JSON.stringify(files, null, 2)}
`.trim();
};

export default securityReviewPrompt;