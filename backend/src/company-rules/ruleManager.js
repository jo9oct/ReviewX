import {
  normalizeRules
} from "./ruleNormalizer.js";

import {
  ruleApplies
} from "./ruleMatcher.js";

import {
  evaluateRule
} from "./ruleEvaluator.js";

import {
  createFinding
} from "../analysis/findingFactory.js";

export function evaluateCompanyRules(
  context
) {
  const normalizedRules =
    normalizeRules(
      context.companyRules || []
    );

  const findings = [];

  for (
    const rule of normalizedRules
  ) {
    if (
      !ruleApplies(
        rule,
        context
      )
    ) {
      continue;
    }

    const result =
      evaluateRule(
        rule,
        context
      );

    if (
      !result.violated
    ) {
      continue;
    }

    const ruleFindings =
      createRuleFindings(
        rule,
        result,
        context
      );

    findings.push(
      ...ruleFindings
    );
  }

  return findings;
}

function createRuleFindings(
  rule,
  result,
  context
) {
  if (
    result.matches.length === 0
  ) {
    return [
      createFinding({
        category:
          "quality",

        type:
          "company-rule",

        ruleId:
          `COMPANY-${rule.id}`,

        title:
          rule.title,

        description:
          rule.description,

        severity:
          rule.severity,

        confidence:
          "high",

        status:
          "detected",

        file:
          context.fileName,

        line:
          1,

        column:
          1,

        code:
          context.code
            .split("\n")[0] ||
          null,

        evidence: [
          {
            type:
              "pattern",

            file:
              context.fileName,

            line:
              1,

            column:
              1,

            code:
              context.code
                .split("\n")[0] ||
              null,

            description:
              "The required company pattern was not detected in the reviewed source."
          }
        ],

        recommendation:
          rule.recommendation,

        analyzer:
          "company-rules"
      })
    ];
  }

  return result.matches.map(
    (match) =>
      createFinding({
        category:
          "quality",

        type:
          "company-rule",

        ruleId:
          `COMPANY-${rule.id}`,

        title:
          rule.title,

        description:
          rule.description,

        severity:
          rule.severity,

        confidence:
          "high",

        status:
          "detected",

        file:
          context.fileName,

        line:
          match.line,

        column:
          match.column,

        code:
          match.code,

        evidence: [
          {
            type:
              "pattern",

            file:
              context.fileName,

            line:
              match.line,

            column:
              match.column,

            code:
              match.code,

            description:
              "The reviewed source matches a company-defined rule pattern."
          }
        ],

        recommendation:
          rule.recommendation,

        analyzer:
          "company-rules"
      })
  );
}