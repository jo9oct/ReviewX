import {
  createFinding
} from "../../../analysis/findingFactory.js";

import {
  nullPatterns
} from "./nullPatterns.js";

import {
  nullRules
} from "./nullRules.js";

export function analyzeNull(context) {
  if (!context?.code) {
    return [];
  }

  if (
    !isSupportedLanguage(
      context.language
    )
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
      context.language === "python"
        ? analyzePythonNone(
            line,
            index,
            lines,
            context
          )
        : analyzeJavaScriptNull(
            line,
            index,
            lines,
            context
          );

    if (finding) {
      findings.push(finding);
    }
  }

  return findings;
}

function analyzeJavaScriptNull(
  line,
  index,
  lines,
  context
) {
  if (
    hasExplicitNullAssignment(line)
  ) {
    return null;
  }

  const nullableAssignment =
    line.match(
      nullPatterns.nullableAssignment
    );

  if (!nullableAssignment) {
    return null;
  }

  const variableName =
    nullableAssignment[1];

  const nextLines =
    lines
      .slice(
        index + 1,
        Math.min(
          index + 7,
          lines.length
        )
      )
      .join("\n");

  const accessPattern =
    new RegExp(
      `\\b${escapeRegExp(variableName)}\\s*\\.\\s*[A-Za-z_$][\\w$]*`
    );

  const methodPattern =
    new RegExp(
      `\\b${escapeRegExp(variableName)}\\s*\\.\\s*[A-Za-z_$][\\w$]*\\s*\\(`
    );

  const accessMatch =
    nextLines.match(
      methodPattern
    ) ||
    nextLines.match(
      accessPattern
    );

  if (!accessMatch) {
    return null;
  }

  if (
    hasNullGuard(
      nextLines,
      variableName
    )
  ) {
    return null;
  }

  const accessLineOffset =
    getAccessLineOffset(
      lines,
      index + 1,
      variableName
    );

  const accessLine =
    lines[accessLineOffset] || line;

  const column =
    getAccessColumn(
      accessLine,
      variableName
    );

  return createNullFinding({
    rule:
      nullRules.unsafeNullableAccess,
    line: accessLine,
    lineNumber:
      accessLineOffset + 1,
    column,
    context
  });
}

function analyzePythonNone(
  line,
  index,
  lines,
  context
) {
  const assignment =
    line.match(
      nullPatterns.pythonNullableAssignment
    );

  if (!assignment) {
    return null;
  }

  const variableName =
    assignment[1];

  const nextLines =
    lines
      .slice(
        index + 1,
        Math.min(
          index + 7,
          lines.length
        )
      )
      .join("\n");

  const accessPattern =
    new RegExp(
      `\\b${escapeRegExp(variableName)}\\s*\\.\\s*[A-Za-z_][\\w]*`
    );

  if (
    !accessPattern.test(nextLines)
  ) {
    return null;
  }

  if (
    hasPythonNoneGuard(
      nextLines,
      variableName
    )
  ) {
    return null;
  }

  const accessLineOffset =
    getAccessLineOffset(
      lines,
      index + 1,
      variableName
    );

  const accessLine =
    lines[accessLineOffset] || line;

  const column =
    getAccessColumn(
      accessLine,
      variableName
    );

  return createNullFinding({
    rule:
      nullRules.pythonNoneAccess,
    line: accessLine,
    lineNumber:
      accessLineOffset + 1,
    column,
    context
  });
}

function createNullFinding({
  rule,
  line,
  lineNumber,
  column,
  context
}) {
  return createFinding({
    category: "bug",
    type: "null-undefined",
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
    analyzer: "null"
  });
}

function hasExplicitNullAssignment(line) {
  return nullPatterns.explicitNull.test(
    line.trim()
  );
}

function hasNullGuard(
  source,
  variableName
) {
  const escaped =
    escapeRegExp(variableName);

  const directComparison =
    new RegExp(
      `\\b${escaped}\\b\\s*(?:===|!==|==|!=)\\s*(?:null|undefined)`
    );

  const reverseComparison =
    new RegExp(
      `(?:null|undefined)\\s*(?:===|!==|==|!=)\\s*\\b${escaped}\\b`
    );

  const conditionalGuard =
    new RegExp(
      `\\b(?:if|while)\\s*\\([^)]*\\b${escaped}\\b[^)]*(?:null|undefined)`
    );

  const optionalPropertyAccess =
    new RegExp(
      `\\b${escaped}\\s*\\?\\.`
    );

  const nullishFallback =
    new RegExp(
      `\\b${escaped}\\s*\\?\\?`
    );

  return (
    directComparison.test(source) ||
    reverseComparison.test(source) ||
    conditionalGuard.test(source) ||
    optionalPropertyAccess.test(source) ||
    nullishFallback.test(source)
  );
}

function hasPythonNoneGuard(
  source,
  variableName
) {
  const escaped =
    escapeRegExp(variableName);

  const notNone =
    new RegExp(
      `\\b${escaped}\\b\\s+is\\s+not\\s+None`
    );

  const noneCheck =
    new RegExp(
      `\\b${escaped}\\b\\s+is\\s+None`
    );

  return (
    notNone.test(source) ||
    noneCheck.test(source)
  );
}

function getAccessLineOffset(
  lines,
  startIndex,
  variableName
) {
  const pattern =
    new RegExp(
      `\\b${escapeRegExp(variableName)}\\s*\\.`
    );

  for (
    let index = startIndex;
    index < lines.length;
    index += 1
  ) {
    if (
      pattern.test(lines[index])
    ) {
      return index;
    }
  }

  return startIndex;
}

function getAccessColumn(
  line,
  variableName
) {
  const index =
    line.indexOf(variableName);

  return index >= 0
    ? index + 1
    : firstCodeColumn(line);
}

function isSupportedLanguage(language) {
  return [
    "javascript",
    "typescript",
    "python"
  ].includes(language);
}

function firstCodeColumn(line) {
  const match =
    line.match(/\S/);

  return match
    ? match.index + 1
    : 1;
}

function escapeRegExp(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
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