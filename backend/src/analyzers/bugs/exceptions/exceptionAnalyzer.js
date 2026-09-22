
import {
  createFinding
} from "../../../analysis/findingFactory.js";

import {
  exceptionPatterns
} from "./exceptionPatterns.js";

import {
  exceptionRules
} from "./exceptionRules.js";

export function analyzeExceptions(
  context
) {
  if (
    !context?.code
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

    const emptyCatch =
      analyzeEmptyCatch(
        line,
        index,
        context
      );

    if (emptyCatch) {
      findings.push(
        emptyCatch
      );
    }

    const consoleOnly =
      analyzeConsoleOnlyCatch(
        lines,
        index,
        context
      );

    if (consoleOnly) {
      findings.push(
        consoleOnly
      );
    }
  }

  findings.push(
    ...analyzeExpressAsyncHandlers(
      lines,
      context
    )
  );

  return findings;
}

function analyzeEmptyCatch(
  line,
  index,
  context
) {
  if (
    !exceptionPatterns.emptyCatch.test(
      line
    )
  ) {
    return null;
  }

  return createExceptionFinding({
    rule:
      exceptionRules.emptyCatch,
    line,
    lineNumber: index + 1,
    column:
      Math.max(
        line.indexOf("catch") + 1,
        1
      ),
    context
  });
}

function analyzeConsoleOnlyCatch(
  lines,
  index,
  context
) {
  if (
    !/\bcatch\s*\(/.test(
      lines[index]
    )
  ) {
    return null;
  }

  const block =
    lines
      .slice(
        index,
        Math.min(
          index + 8,
          lines.length
        )
      )
      .join("\n");

  if (
    !exceptionPatterns.consoleOnly.test(
      block
    )
  ) {
    return null;
  }

  if (
    /\bthrow\b/.test(block) ||
    /\bnext\s*\(/.test(block) ||
    /\breturn\b/.test(block)
  ) {
    return null;
  }

  return createExceptionFinding({
    rule:
      exceptionRules.consoleOnlyCatch,
    line: lines[index],
    lineNumber: index + 1,
    column:
      Math.max(
        lines[index].indexOf("catch") + 1,
        1
      ),
    context
  });
}

function analyzeExpressAsyncHandlers(
  lines,
  context
) {
  const findings = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    if (
      !exceptionPatterns.expressRoute.test(
        line
      )
    ) {
      continue;
    }

    const block =
      lines
        .slice(
          index,
          Math.min(
            index + 15,
            lines.length
          )
        )
        .join("\n");

    if (
      !/\basync\b/.test(block)
    ) {
      continue;
    }

    if (
      /\bnext\s*\(/.test(block) ||
      /\btry\s*\{/.test(block) ||
      /\bcatch\s*\(/.test(block)
    ) {
      continue;
    }

    findings.push(
      createExceptionFinding({
        rule:
          exceptionRules.expressAsyncHandler,
        line,
        lineNumber:
          index + 1,
        column:
          Math.max(
            line.indexOf(".") + 1,
            1
          ),
        context
      })
    );
  }

  return findings;
}

function createExceptionFinding({
  rule,
  line,
  lineNumber,
  column,
  context
}) {
  return createFinding({
    category: "bug",
    type: "exception-error",
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
    analyzer: "exceptions"
  });
}

function isComment(line) {
  return (
    line.startsWith("//") ||
    line.startsWith("/*") ||
    line.startsWith("*")
  );
}