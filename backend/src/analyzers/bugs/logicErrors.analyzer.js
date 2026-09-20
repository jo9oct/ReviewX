
import {
  createFinding
} from "../../analysis/findingFactory.js";

export function analyzeLogicErrors(
  context
) {
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
    const currentLine =
      lines[index];

    const nextLine =
      lines[index + 1] || "";

    const previousLine =
      lines[index - 1] || "";

    const finding =
      analyzeAssignmentCondition({
        line: currentLine,
        lineNumber: index + 1,
        fileName: context.fileName,
        language: context.language
      }) ||
      analyzeUnreachableStatement({
        line: currentLine,
        previousLine,
        previousLineNumber:
          index,
        lineNumber: index + 1,
        fileName: context.fileName
      }) ||
      analyzeEmptyConditional({
        line: currentLine,
        nextLine,
        lineNumber: index + 1,
        fileName: context.fileName
      }) ||
      analyzeContradictoryCondition({
        line: currentLine,
        lineNumber: index + 1,
        fileName: context.fileName
      });

    if (finding) {
      findings.push(finding);
    }
  }

  findings.push(
    ...analyzeStaticLoopConditions({
      lines,
      fileName: context.fileName
    })
  );

  return findings;
}

function analyzeAssignmentCondition({
  line,
  lineNumber,
  fileName,
  language
}) {
  if (
    ![
      "javascript",
      "typescript"
    ].includes(language)
  ) {
    return null;
  }

  const trimmed =
    line.trim();

  if (
    /^(?:if|while|for)\s*\(/.test(
      trimmed
    )
  ) {
    const condition =
      extractCondition(trimmed);

    if (
      condition &&
      /(^|[^=!<>])=([^=]|$)/.test(
        condition
      )
    ) {
      const column =
        line.indexOf("=") + 1;

      return createLogicFinding({
        ruleId: "BUG-LOGIC-001",
        title:
          "Assignment used inside a conditional expression.",
        description:
          "An assignment operator appears inside a conditional expression where a comparison may have been intended.",
        severity: "high",
        confidence: "high",
        line,
        lineNumber,
        column,
        fileName,
        recommendation:
          "Verify whether the assignment is intentional. If the code is intended to compare values, use the appropriate comparison operator."
      });
    }
  }

  return null;
}

function analyzeUnreachableStatement({
  line,
  previousLine,
  previousLineNumber,
  lineNumber,
  fileName
}) {
  if (
    !/\S/.test(line) ||
    !/\b(?:return|throw|break|continue)\b\s*;?\s*$/.test(
      previousLine.trim()
    )
  ) {
    return null;
  }

  if (
    isClosingSyntax(line.trim())
  ) {
    return null;
  }

  return createLogicFinding({
    ruleId: "BUG-LOGIC-002",
    title:
      "Potential unreachable statement.",
    description:
      "A statement appears immediately after an unconditional control-flow exit.",
    severity: "medium",
    confidence: "high",
    line,
    lineNumber,
    column:
      firstCodeColumn(line),
    fileName,
    recommendation:
      "Remove unreachable code or adjust the control flow so the statement can execute when intended."
  });
}

function analyzeEmptyConditional({
  line,
  nextLine,
  lineNumber,
  fileName
}) {
  const trimmed =
    line.trim();

  if (
    !/^(?:if|else\s+if|else|catch|finally)\b/.test(
      trimmed
    )
  ) {
    return null;
  }

  if (
    !/[{:]?\s*$/.test(trimmed)
  ) {
    return null;
  }

  const next =
    nextLine.trim();

  if (
    next === "}" ||
    next === "pass"
  ) {
    return createLogicFinding({
      ruleId: "BUG-LOGIC-003",
      title:
        "Conditional branch contains no effective logic.",
      description:
        "The conditional branch appears to contain no executable action.",
      severity: "low",
      confidence: "medium",
      line,
      lineNumber,
      column:
        firstCodeColumn(line),
      fileName,
      recommendation:
        "Verify that the empty branch is intentional. Remove unnecessary branches or implement the required behavior."
    });
  }

  return null;
}

function analyzeContradictoryCondition({
  line,
  lineNumber,
  fileName
}) {
  const trimmed =
    line.trim();

  const condition =
    extractCondition(trimmed);

  if (!condition) {
    return null;
  }

  const patterns = [
    {
      regex:
        /\b([A-Za-z_$][\w$]*)\s*===\s*([^\s]+)\s*&&\s*\1\s*!==\s*\2\b/,
      description:
        "The same value is required to be equal and not equal to the same value."
    },
    {
      regex:
        /\b([A-Za-z_$][\w$]*)\s*>\s*([0-9]+)\s*&&\s*\1\s*<\s*([0-9]+)\b/,
      description:
        "The same value is constrained by mutually incompatible comparisons."
    }
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(condition)) {
      return createLogicFinding({
        ruleId: "BUG-LOGIC-004",
        title:
          "Potential contradictory conditional logic.",
        description:
          pattern.description,
        severity: "medium",
        confidence: "high",
        line,
        lineNumber,
        column:
          firstCodeColumn(line),
        fileName,
        recommendation:
          "Review the condition and verify that all comparisons can be true at the same time."
      });
    }
  }

  return null;
}

function analyzeStaticLoopConditions({
  lines,
  fileName
}) {
  const findings = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    const match =
      line.match(
        /\bwhile\s*\(\s*(true|false|1|0)\s*\)/
      );

    if (!match) {
      continue;
    }

    if (
      match[1] === "false" ||
      match[1] === "0"
    ) {
      findings.push(
        createLogicFinding({
          ruleId: "BUG-LOGIC-005",
          title:
            "Loop condition is statically false.",
          description:
            "The loop condition is a constant false value, so the loop body cannot execute.",
          severity: "medium",
          confidence: "high",
          line,
          lineNumber: index + 1,
          column:
            line.indexOf(
              match[1]
            ) + 1,
          fileName,
          recommendation:
            "Verify the loop condition and remove the loop if the body is not intended to execute."
        })
      );
    }
  }

  return findings;
}

function createLogicFinding({
  ruleId,
  title,
  description,
  severity,
  confidence,
  line,
  lineNumber,
  column,
  fileName,
  recommendation
}) {
  return createFinding({
    category: "bug",
    type: "logic-error",
    ruleId,
    title,
    description,
    severity,
    confidence,
    status: "detected",
    file: fileName,
    line: lineNumber,
    column,
    code: line,
    evidence: [
      {
        type: "source",
        file: fileName,
        line: lineNumber,
        column,
        code: line,
        description
      }
    ],
    recommendation,
    analyzer: "logic-errors"
  });
}

function extractCondition(
  line
) {
  const match =
    line.match(
      /\((.*)\)/
    );

  return match
    ? match[1]
    : null;
}

function firstCodeColumn(
  line
) {
  const match =
    line.match(/\S/);

  return match
    ? match.index + 1
    : 1;
}

function isClosingSyntax(
  line
) {
  return (
    line === "}" ||
    line === ")" ||
    line === "]" ||
    line.startsWith("}")
  );
}