import {
  analyzeAll
} from "./analyzerManager.js";

import {
  mergeFindings
} from "./findingMerger.js";

import {
  deduplicateFindings
} from "./findingDeduplicator.js";

import {
  collectEvidence
} from "./evidenceCollector.js";

import {
  calculateScore
} from "./scoreEngine.js";

import {
  buildResult
} from "./resultBuilder.js";

import {
  evaluateCompanyRules
} from "../company-rules/ruleManager.js";

import {
  analyzeWithAI
} from "../ai/aiManager.js";

export async function runReview(
  context,
  access = null,
  onStage = null
) {
  validateContext(
    context
  );

  if (typeof onStage === "function") {
    await onStage("analyzing", 35);
  }

  const analyzerFindings =
    await analyzeAll(
      context
    );

  if (typeof onStage === "function") {
    await onStage("applying_rules", 55);
  }

  const companyRuleFindings =
    await evaluateCompanyRules(
      context
    );

  const allFindings = [
    ...analyzerFindings,
    ...companyRuleFindings
  ];

  const merged =
    mergeFindings(
      allFindings
    );

  const deduplicated =
    deduplicateFindings(
      merged
    );

  const findingsWithEvidence =
    collectEvidence(
      deduplicated,
      context.code
    );

  if (typeof onStage === "function") {
    await onStage("generating_ai", 75);
  }

  const aiAnalysis =
    await analyzeWithAI({
      context,
      findings: findingsWithEvidence,
      access
    });

  if (typeof onStage === "function") {
    await onStage("scoring", 90);
  }

  const score =
    calculateScore(
      findingsWithEvidence
    );

  return buildResult({
    context,
    findings:
      findingsWithEvidence,
    score,
    aiAnalysis
  });
}

function validateContext(
  context
) {
  if (
    !context ||
    typeof context !== "object"
  ) {
    throw new TypeError(
      "Review context is required."
    );
  }

  if (
    typeof context.code !==
    "string"
  ) {
    throw new TypeError(
      "Review context must contain source code."
    );
  }

  if (
    !context.language
  ) {
    throw new TypeError(
      "Review context must contain a language."
    );
  }
}