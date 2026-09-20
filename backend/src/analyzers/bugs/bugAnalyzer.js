import {
  analyzeNullUndefined
} from "./nullUndefined.analyzer.js";

import {
  analyzeLogicErrors
} from "./logicErrors.analyzer.js";

export function analyzeBugs(
  context
) {
  const findings = [];

  findings.push(
    ...analyzeNullUndefined(
      context
    )
  );

  findings.push(
    ...analyzeLogicErrors(
      context
    )
  );

  return findings;
}