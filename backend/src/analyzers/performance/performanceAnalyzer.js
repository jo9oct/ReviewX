import {
  analyzeNPlusOne
} from "./nPlusOne.analyzer.js";

export function analyzePerformance(
  context
) {
  const findings = [];

  findings.push(
    ...analyzeNPlusOne(
      context
    )
  );

  return findings;
}