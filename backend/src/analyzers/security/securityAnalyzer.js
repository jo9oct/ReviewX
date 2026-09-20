import {
  analyzeSqlInjection
} from "./sqli.analyzer.js";

import {
  analyzeAccessControl
} from "./accessControl.analyzer.js";

import {
  analyzeAuthentication
} from "./authentication.analyzer.js";

export function analyzeSecurity(
  context
) {
  const findings = [];

  findings.push(
    ...analyzeSqlInjection(
      context
    )
  );

  findings.push(
    ...analyzeAccessControl(
      context
    )
  );

  findings.push(
    ...analyzeAuthentication(
      context
    )
  );

  return findings;
}