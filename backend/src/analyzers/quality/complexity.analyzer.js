
import {
  createFinding
} from "../../analysis/findingFactory.js";

const DEFAULT_COMPLEXITY_THRESHOLD = 10;

const CONTROL_FLOW_PATTERN =
  /\b(?:if|else\s+if|for|while|catch|case)\b|\?|&&|\|\|/g;

export function analyzeComplexity(
  context,
  options = {}
) {
  if (!context?.code) {
    return [];
  }

  const threshold =
    Number.isInteger(
      options.threshold
    ) &&
    options.threshold > 0
      ? options.threshold
      : DEFAULT_COMPLEXITY_THRESHOLD;

  const lines =
    context.code.split("\n");

  const findings = [];

  const functions =
    Array.isArray(
      context.parsed?.functions
    )
      ? context.parsed.functions
      : [];

  if (functions.length === 0) {
    return analyzeFileComplexity({
      lines,
      fileName: context.fileName,
      threshold
    });
  }

  for (
    let index = 0;
    index < functions.length;
    index += 1
  ) {
    const current =
      functions[index];

    const next =
      functions[index + 1];

    const startLine =
      current.line;

    const endLine =
      next?.line
        ? Math.max(
            startLine,
            next.line - 1
          )
        : lines.length;

    const functionLines =
      lines.slice(
        startLine - 1,
        endLine
      );

    const complexity =
      calculateComplexity(
        functionLines
      );

    if (
      complexity <= threshold
    ) {
      continue;
    }

    const evidenceLine =
      functionLines[0] ||
      "";

    findings.push(
      createFinding({
        category: "quality",
        type: "code-complexity",
        ruleId: "QUALITY-COMPLEXITY-001",
        title:
          "Function has high cyclomatic complexity.",
        description:
          `The function "${current.name}" has an estimated cyclomatic complexity of ${complexity}, which exceeds the configured threshold of ${threshold}.`,
        severity:
          complexity >= threshold * 2
            ? "high"
            : "medium",
        confidence: "medium",
        status: "detected",
        file: context.fileName,
        line: startLine,
        column: 1,
        code: evidenceLine,
        evidence: [
          {
            type: "pattern",
            file: context.fileName,
            line: startLine,
            column: 1,
            code: evidenceLine,
            description:
              `The function contains approximately ${complexity - 1} additional control-flow decision points.`
          }
        ],
        recommendation:
          "Reduce branching and split complex logic into smaller focused functions. Consider simplifying nested conditions and extracting independent decision paths.",
        analyzer: "complexity"
      })
    );
  }

  return findings;
}

function analyzeFileComplexity({
  lines,
  fileName,
  threshold
}) {
  const complexity =
    calculateComplexity(lines);

  if (
    complexity <= threshold
  ) {
    return [];
  }

  return [
    createFinding({
      category: "quality",
      type: "code-complexity",
      ruleId: "QUALITY-COMPLEXITY-002",
      title:
        "Source file has high control-flow complexity.",
      description:
        `The source contains an estimated cyclomatic complexity of ${complexity}, exceeding the configured threshold of ${threshold}.`,
      severity:
        complexity >= threshold * 2
          ? "high"
          : "medium",
      confidence: "low",
      status: "detected",
      file: fileName,
      line: findFirstDecisionLine(
        lines
      ),
      column: 1,
      code:
        lines[
          findFirstDecisionLine(lines) - 1
        ] || null,
      evidence: [
        {
          type: "pattern",
          file: fileName,
          line:
            findFirstDecisionLine(
              lines
            ),
          column: 1,
          code:
            lines[
              findFirstDecisionLine(
                lines
              ) - 1
            ] || null,
          description:
            "Multiple control-flow decision points were detected across the source."
        }
      ],
      recommendation:
        "Split complex logic into smaller functions and simplify nested control flow.",
      analyzer: "complexity"
    })
  ];
}

function calculateComplexity(
  lines
) {
  let complexity = 1;

  for (const line of lines) {
    const stripped =
      removeStringsAndComments(line);

    const matches =
      stripped.match(
        CONTROL_FLOW_PATTERN
      );

    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

function removeStringsAndComments(
  line
) {
  return line
    .replace(
      /(["'`])(?:\\.|(?!\1).)*\1/g,
      ""
    )
    .replace(
      /\/\/.*$/,
      ""
    )
    .replace(
      /#.*$/,
      ""
    );
}

function findFirstDecisionLine(
  lines
) {
  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    if (
      CONTROL_FLOW_PATTERN.test(
        lines[index]
      )
    ) {
      CONTROL_FLOW_PATTERN.lastIndex = 0;
      return index + 1;
    }

    CONTROL_FLOW_PATTERN.lastIndex = 0;
  }

  return 1;
}