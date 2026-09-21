const mockCompanyRules = [
  {
    id: "mock-rule-001",
    title: "Use strict equality",
    description:
      "Company code must use strict equality operators.",
    type: "forbidden-pattern",
    severity: "medium",
    pattern: "(?<![=!])==(?!=)",
    recommendation:
      "Use === instead of ==.",
    languages: [
      "javascript"
    ],
    enabled: true
  }
];

export default mockCompanyRules;