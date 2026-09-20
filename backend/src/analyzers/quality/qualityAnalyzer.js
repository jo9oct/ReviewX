import {
  analyzeComplexity
} from "./complexity.analyzer.js";

import {
  analyzeUnusedCode
} from "./unusedCode.analyzer.js";

export function analyzeQuality(
  context
) {
  const findings = [];

  findings.push(
    ...analyzeComplexity(
      context
    )
  );

  findings.push(
    ...analyzeUnusedCode(
      context
    )
  );

  return findings;
}