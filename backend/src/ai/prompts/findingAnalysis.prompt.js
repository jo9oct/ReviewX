const findingAnalysisPrompt = ({
  finding,
  source
}) => {
  return `
You are assisting a static code review system.

Analyze the supplied finding using ONLY the provided source
and deterministic finding information.

Do not invent:
- vulnerabilities
- CVEs
- dependencies
- versions
- exploit results
- test results
- source locations
- evidence

Determine whether the finding appears technically justified.

Return JSON only:

{
  "assessment": "confirmed|likely|uncertain|not_supported",
  "explanation": "short explanation",
  "remediation": "practical remediation guidance"
}

Finding:
${JSON.stringify(finding, null, 2)}

Source:
${source}
`.trim();
};

export default findingAnalysisPrompt;