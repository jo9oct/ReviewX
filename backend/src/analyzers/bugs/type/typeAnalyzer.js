import {
  createFinding
} from "../../../analysis/findingFactory.js";

import {
  typePatterns
} from "./typePatterns.js";

import {
  typeRules
} from "./typeRules.js";

export function analyzeTypes(context) {
  if (
    !context?.code ||
    ![
      "javascript",
      "typescript"
    ].includes(context.language)
  ) {
    return [];
  }

  const lines =
    context.code.split("\n");

  const findings = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    const trimmed =
      line.trim();

    if (
      !trimmed ||
      isComment(trimmed)
    ) {
      continue;
    }

    const finding =
      analyzeInvalidTypeof(
        line,
        index,
        context
      );

    if (finding) {
      findings.push(finding);
    }
  }

  return findings;
}

function analyzeInvalidTypeof(
  line,
  index,
  context
) {
  const match =
    line.match(
      typePatterns.invalidTypeof
    );

  if (!match) {
    return null;
  }

  return createTypeFinding({
    rule:
      typeRules.invalidTypeof,
    line,
    lineNumber: index + 1,
    column:
      match.index + 1,
    context
  });
}

function createTypeFinding({
  rule,
  line,
  lineNumber,
  column,
  context
}) {
  return createFinding({
    category: "bug",
    type: "type-error",
    ruleId: rule.id,
    title: rule.title,
    description: rule.description,
    severity: rule.severity,
    confidence: rule.confidence,
    status: "detected",
    file: context.fileName,
    line: lineNumber,
    column,
    code: line,
    evidence: [
      {
        type: "source",
        file: context.fileName,
        line: lineNumber,
        column,
        code: line,
        description:
          rule.description
      }
    ],
    recommendation:
      rule.recommendation,
    analyzer: "type"
  });
}

function isComment(line) {
  return (
    line.startsWith("//") ||
    line.startsWith("/*") ||
    line.startsWith("*")
  );
}