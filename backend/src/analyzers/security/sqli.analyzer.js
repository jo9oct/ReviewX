
import {
  createFinding
} from "../../analysis/findingFactory.js";

const SQL_KEYWORDS =
  /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|VALUES|SET)\b/i;

const QUERY_CALL =
  /\b(?:query|execute|exec|raw|rawQuery|queryRaw)\s*\(/i;

export function analyzeSqlInjection(
  context
) {
  const findings = [];

  if (!context?.code) {
    return findings;
  }

  const lines =
    context.code.split("\n");

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    const finding =
      analyzeLine({
        line,
        lineNumber: index + 1,
        language: context.language,
        fileName: context.fileName
      });

    if (finding) {
      findings.push(finding);
    }
  }

  return findings;
}

function analyzeLine({
  line,
  lineNumber,
  language,
  fileName
}) {
  const trimmed =
    line.trim();

  if (
    !trimmed ||
    isCommentLine(trimmed)
  ) {
    return null;
  }

  if (!SQL_KEYWORDS.test(line)) {
    return null;
  }

  const interpolation =
    hasInterpolation(line);

  const concatenation =
    hasUnsafeConcatenation(line);

  const queryCall =
    QUERY_CALL.test(line);

  if (
    !interpolation &&
    !concatenation &&
    !queryCall
  ) {
    return null;
  }

  const isLikelyUnsafe =
    interpolation ||
    concatenation;

  if (!isLikelyUnsafe) {
    return null;
  }

  return createFinding({
    category: "security",
    type: "sql-injection",
    ruleId: "SEC-SQLI-001",
    title:
      "Potential SQL injection through dynamic query construction.",
    description:
      "The source code constructs a SQL statement using dynamic data instead of demonstrating a parameterized query.",
    severity: "high",
    confidence: determineConfidence({
      language,
      interpolation,
      concatenation
    }),
    status: "detected",
    file: fileName,
    line: lineNumber,
    column: findDynamicColumn(line),
    code: line,
    evidence: [
      {
        type: "source",
        file: fileName,
        line: lineNumber,
        column: findDynamicColumn(line),
        code: line,
        description:
          buildEvidenceDescription({
            interpolation,
            concatenation
          })
      }
    ],
    recommendation:
      "Use parameterized queries or prepared statements and bind user-controlled values as parameters. Do not concatenate untrusted input into SQL statements.",
    analyzer: "sqli"
  });
}

function hasInterpolation(line) {
  return (
    /`[^`]*(?:\$\{[^}]+\})[^`]*`/.test(
      line
    ) ||
    /\b(?:f|rf)["'][^"']*\{[^}]+\}/i.test(
      line
    ) ||
    /\$\w+/.test(line) &&
      SQL_KEYWORDS.test(line)
  );
}

function hasUnsafeConcatenation(line) {
  if (!/[+]/.test(line)) {
    return false;
  }

  const parts =
    line.split("+");

  if (parts.length < 2) {
    return false;
  }

  const hasSqlText =
    parts.some((part) =>
      SQL_KEYWORDS.test(part)
    );

  if (!hasSqlText) {
    return false;
  }

  return parts.some((part) =>
    /\b(?:req|request|params|query|body|input|user|id|name|email)\b/i.test(
      part
    )
  );
}

function findDynamicColumn(line) {
  const dynamicMatch =
    line.match(
      /\$\{|\+|\b(?:req|request|params|query|body)\b/
    );

  if (!dynamicMatch) {
    return 1;
  }

  return dynamicMatch.index + 1;
}

function determineConfidence({
  language,
  interpolation,
  concatenation
}) {
  if (
    interpolation &&
    [
      "javascript",
      "typescript",
      "php"
    ].includes(language)
  ) {
    return "high";
  }

  if (concatenation) {
    return "high";
  }

  return "medium";
}

function buildEvidenceDescription({
  interpolation,
  concatenation
}) {
  if (interpolation) {
    return "A SQL statement contains dynamically interpolated data.";
  }

  if (concatenation) {
    return "A SQL statement is assembled using string concatenation.";
  }

  return "Dynamic data is used in SQL construction.";
}

function isCommentLine(line) {
  return (
    line.startsWith("//") ||
    line.startsWith("#") ||
    line.startsWith("--") ||
    line.startsWith("/*") ||
    line.startsWith("*")
  );
}