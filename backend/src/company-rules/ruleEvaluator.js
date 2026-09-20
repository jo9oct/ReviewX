
import {
  findPatternMatches
} from "./ruleMatcher.js";

export function evaluateRule(
  rule,
  context
) {
  if (!rule || !context) {
    return {
      violated: false,
      matches: []
    };
  }

  switch (rule.type) {
    case "forbidden-pattern":
      return evaluateForbiddenPattern(
        rule,
        context
      );

    case "required-pattern":
      return evaluateRequiredPattern(
        rule,
        context
      );

    case "pattern":
      return evaluatePattern(
        rule,
        context
      );

    default:
      return {
        violated: false,
        matches: []
      };
  }
}

function evaluateForbiddenPattern(
  rule,
  context
) {
  const matches =
    findPatternMatches(
      rule,
      context.code
    );

  return {
    violated:
      matches.length > 0,
    matches
  };
}

function evaluateRequiredPattern(
  rule,
  context
) {
  const matches =
    findPatternMatches(
      rule,
      context.code
    );

  return {
    violated:
      matches.length === 0,
    matches
  };
}

function evaluatePattern(
  rule,
  context
) {
  const matches =
    findPatternMatches(
      rule,
      context.code
    );

  return {
    violated:
      rule.required
        ? matches.length === 0
        : matches.length > 0,
    matches
  };
}