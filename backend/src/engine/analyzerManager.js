import {
  analyzeSecurity
} from "../analyzers/security/securityAnalyzer.js";

import {
  analyzeBugs
} from "../analyzers/bugs/bugAnalyzer.js";

import {
  analyzeQuality
} from "../analyzers/quality/qualityAnalyzer.js";

import {
  analyzePerformance
} from "../analyzers/performance/performanceAnalyzer.js";

export async function analyzeAll(
  context
) {
  const results =
    await Promise.all([
      analyzeSecurity(
        context
      ),

      analyzeBugs(
        context
      ),

      analyzeQuality(
        context
      ),

      analyzePerformance(
        context
      )
    ]);

  return results.flat();
}