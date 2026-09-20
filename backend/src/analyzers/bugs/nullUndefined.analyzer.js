
import {
  createFinding
} from "../../analysis/findingFactory.js";

const NULLABLE_NAMES =
  /\b(?:data|result|response|user|account|record|item|value|object|config|request|req|res|response|error|errorObject)\b/i;

const UNSAFE_PROPERTY_ACCESS =
  /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+/;

const UNSAFE_METHOD_CALL =
  /\b[A-Za-z_$][\w$]*\.(?:trim|toLowerCase|toUpperCase|map|filter|forEach|reduce|find|includes|split|replace|toString)\s*\(/;

export function analyzeNullUndefined(
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
    const finding =
      analyzeLine({
        line: lines[index],
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
    isComment(trimmed)
  ) {
    return null;
  }

  if (
    language === "python"
  ) {
    return analyzePythonNone({
      line,
      lineNumber,
      fileName
    });
  }

  if (
    ![
      "javascript",
      "typescript"
    ].includes(language)
  ) {
    return null;
  }

  if (
    hasExplicitNullAssignment(
      line
    )
  ) {
    return null;
  }

  const methodMatch =
    line.match(
      UNSAFE_METHOD_CALL
    );

  if (
    methodMatch &&
    NULLABLE_NAMES.test(
      methodMatch[0]
    ) &&
    !hasNullGuard(line)
  ) {
    return createNullFinding({
      line,
      lineNumber,
      fileName,
      column:
        methodMatch.index + 1,
      confidence: "medium",
      description:
        "A potentially nullable value is used for a method call without an obvious null or undefined guard."
    });
  }

  const propertyMatch =
    line.match(
      UNSAFE_PROPERTY_ACCESS
    );

  if (
    propertyMatch &&
    NULLABLE_NAMES.test(
      propertyMatch[0]
    ) &&
    !hasNullGuard(line) &&
    !isSafePropertyAccess(
      propertyMatch[0]
    )
  ) {
    return createNullFinding({
      line,
      lineNumber,
      fileName,
      column:
        propertyMatch.index + 1,
      confidence: "low",
      description:
        "A potentially nullable object is accessed directly without an obvious null or undefined guard."
    });
  }

  return null;
}

function analyzePythonNone({
  line,
  lineNumber,
  fileName
}) {
  const noneCheck =
    /\bNone\b/.test(line);

  const unsafeAttribute =
    /\b[A-Za-z_]\w*\.[A-Za-z_]\w*/.test(
      line
    );

  if (
    !noneCheck ||
    !unsafeAttribute
  ) {
    return null;
  }

  return createNullFinding({
    line,
    lineNumber,
    fileName,
    column:
      findAttributeColumn(line),
    confidence: "low",
    description:
      "The statement references None together with attribute access, which may indicate an unhandled nullable value."
  });
}

function createNullFinding({
  line,
  lineNumber,
  fileName,
  column,
  confidence,
  description
}) {
  return createFinding({
    category: "bug",
    type: "null-undefined",
    ruleId: "BUG-NULL-001",
    title:
      "Potential null or undefined access.",
    description,
    severity: "medium",
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
    recommendation:
      "Validate the value before accessing its properties or methods. Where appropriate, use explicit null checks, optional chaining, default values, or equivalent language-specific guards.",
    analyzer: "null-undefined"
  });
}

function hasNullGuard(line) {
  return (
    /\?\./.test(line) ||
    /\?\?/.test(line) ||
    /\bif\s*\([^)]*(?:null|undefined)\b/i.test(
      line
    ) ||
    /\b(?:!=|!==|==|===)\s*(?:null|undefined)\b/i.test(
      line
    ) ||
    /\b(?:null|undefined)\s*(?:!=|!==|==|===)\b/i.test(
      line
    )
  );
}

function hasExplicitNullAssignment(
  line
) {
  return (
    /\b(?:const|let|var)\s+\w+\s*=\s*(?:null|undefined)\s*;?\s*$/.test(
      line.trim()
    )
  );
}

function isSafePropertyAccess(
  expression
) {
  return (
    expression.includes("?.") ||
    expression.startsWith("console.") ||
    expression.startsWith("Math.")
  );
}

function findAttributeColumn(
  line
) {
  const match =
    line.match(
      /\b[A-Za-z_]\w*\.[A-Za-z_]\w*/
    );

  return match
    ? match.index + 1
    : 1;
}

function isComment(line) {
  return (
    line.startsWith("//") ||
    line.startsWith("#") ||
    line.startsWith("--") ||
    line.startsWith("/*") ||
    line.startsWith("*")
  );
}