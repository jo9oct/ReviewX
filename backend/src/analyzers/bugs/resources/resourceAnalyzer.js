
import {
  createFinding
} from "../../../analysis/findingFactory.js";

import {
  resourcePatterns
} from "./resourcePatterns.js";

import {
  resourceRules
} from "./resourceRules.js";

export function analyzeResources(
  context
) {
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

    if (
      resourcePatterns.fileOpen.test(
        line
      ) ||
      resourcePatterns.stream.test(
        line
      )
    ) {
      const block =
        getNearbyBlock(
          lines,
          index
        );

      if (
        !resourcePatterns.close.test(
          block
        )
      ) {
        findings.push(
          createResourceFinding({
            rule:
              resourceRules.fileResource,
            line,
            lineNumber:
              index + 1,
            column:
              firstMatchColumn(
                line,
                [
                  "fs.",
                  "createReadStream",
                  "createWriteStream"
                ]
              ),
            context
          })
        );
      }
    }

    if (
      resourcePatterns.databaseConnection.test(
        line
      )
    ) {
      const block =
        getNearbyBlock(
          lines,
          index
        );

      if (
        !resourcePatterns.close.test(
          block
        )
      ) {
        findings.push(
          createResourceFinding({
            rule:
              resourceRules.databaseResource,
            line,
            lineNumber:
              index + 1,
            column:
              firstCodeColumn(line),
            context
          })
        );
      }
    }

    if (
      resourcePatterns.timer.test(
        line
      )
    ) {
      const block =
        getNearbyBlock(
          lines,
          index
        );

      if (
        !resourcePatterns.clearTimer.test(
          block
        )
      ) {
        findings.push(
          createResourceFinding({
            rule:
              resourceRules.timer,
            line,
            lineNumber:
              index + 1,
            column:
              firstCodeColumn(line),
            context
          })
        );
      }
    }
  }

  return findings;
}

function getNearbyBlock(
  lines,
  index
) {
  return lines
    .slice(
      index,
      Math.min(
        index + 20,
        lines.length
      )
    )
    .join("\n");
}

function createResourceFinding({
  rule,
  line,
  lineNumber,
  column,
  context
}) {
  return createFinding({
    category: "bug",
    type: "resource-error",
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
    analyzer: "resources"
  });
}

function firstMatchColumn(
  line,
  values
) {
  for (const value of values) {
    const index =
      line.indexOf(value);

    if (index >= 0) {
      return index + 1;
    }
  }

  return firstCodeColumn(line);
}

function firstCodeColumn(line) {
  const match =
    line.match(/\S/);

  return match
    ? match.index + 1
    : 1;
}