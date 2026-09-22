
import {
  createFinding
} from "../../../analysis/findingFactory.js";

import {
  logicRules
} from "./logicRules.js";

import {
  logicPatterns
} from "./logicPatterns.js";

export function analyzeLogic(context) {
  if (!context?.code) {
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

    const previousLine =
      lines[index - 1] || "";

    const finding =
      analyzeAssignment(
        line,
        index,
        context
      ) ||
      analyzeUnreachable(
        line,
        previousLine,
        index,
        context
      ) ||
      analyzeEmptyBranch(
        line,
        lines[index + 1] || "",
        index,
        context
      ) ||
      analyzeContradictory(
        line,
        index,
        context
      ) ||
      analyzeStaticLoop(
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

function analyzeAssignment(
  line,
  index,
  context
) {
  if (
    ![
      "javascript",
      "typescript"
    ].includes(context.language)
  ) {
    return null;
  }

  const match =
    line.match(
      logicPatterns.assignmentInCondition
    );

  if (!match) {
    return null;
  }

  const condition =
    match[1];

  if (
    !/(^|[^=!<>])=([^=]|$)/.test(
      condition
    )
  ) {
    return null;
  }

  return createLogicFinding({
    rule:
      logicRules.assignmentInCondition,
    line,
    lineNumber: index + 1,
    column:
      Math.max(
        line.indexOf("=") + 1,
        1
      ),
    context
  });
}

function analyzeUnreachable(
  line,
  previousLine,
  index,
  context
) {
  if (
    !/\S/.test(line) ||
    !logicPatterns.unreachableAfterExit.test(
      previousLine.trim()
    )
  ) {
    return null;
  }

  if (
    isClosingSyntax(
      line.trim()
    )
  ) {
    return null;
  }

  return createLogicFinding({
    rule:
      logicRules.unreachableCode,
    line,
    lineNumber: index + 1,
    column:
      firstCodeColumn(line),
    context
  });
}

function analyzeEmptyBranch(
  line,
  nextLine,
  index,
  context
) {
  const trimmed =
    line.trim();

  if (
    !logicPatterns.emptyBranch.test(
      trimmed
    )
  ) {
    return null;
  }

  if (
    !/[{:]$/.test(trimmed)
  ) {
    return null;
  }

  const next =
    nextLine.trim();

  if (
    next !== "}" &&
    next !== "pass"
  ) {
    return null;
  }

  return createLogicFinding({
    rule:
      logicRules.emptyBranch,
    line,
    lineNumber: index + 1,
    column:
      firstCodeColumn(line),
    context
  });
}

function analyzeContradictory(
  line,
  index,
  context
) {
  if (
    logicPatterns.contradictoryEquality.test(
      line
    ) ||
    logicPatterns.contradictoryRange.test(
      line
    )
  ) {
    return createLogicFinding({
      rule:
        logicRules.contradictoryCondition,
      line,
      lineNumber: index + 1,
      column:
        firstCodeColumn(line),
      context
    });
  }

  return null;
}

function analyzeStaticLoop(
  line,
  index,
  context
) {
  const falseMatch =
    line.match(
      logicPatterns.staticFalseLoop
    );

  if (falseMatch) {
    return createLogicFinding({
      rule:
        logicRules.staticFalseLoop,
      line,
      lineNumber: index + 1,
      column:
        line.indexOf(
          falseMatch[1]
        ) + 1,
      context
    });
  }

  const trueMatch =
    line.match(
      logicPatterns.staticTrueLoop
    );

  if (trueMatch) {
    return createLogicFinding({
      rule:
        logicRules.staticTrueLoop,
      line,
      lineNumber: index + 1,
      column:
        line.indexOf(
          trueMatch[1]
        ) + 1,
      context
    });
  }

  return null;
}

function createLogicFinding({
  rule,
  line,
  lineNumber,
  column,
  context
}) {
  return createFinding({
    category: "bug",
    type: "logic-error",
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
    analyzer: "logic"
  });
}

function firstCodeColumn(line) {
  const match =
    line.match(/\S/);

  return match
    ? match.index + 1
    : 1;
}

function isClosingSyntax(line) {
  return (
    line === "}" ||
    line === ")" ||
    line === "]" ||
    line.startsWith("}")
  );
}