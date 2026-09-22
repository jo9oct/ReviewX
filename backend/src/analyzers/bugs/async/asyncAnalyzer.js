import {
  createFinding
} from "../../../analysis/findingFactory.js";

import {
  asyncPatterns
} from "./asyncPatterns.js";

import {
  asyncRules
} from "./asyncRules.js";

export function analyzeAsync(context) {
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
      analyzeUnhandledPromise(
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

function analyzeUnhandledPromise(
  line,
  index,
  context
) {
  const match =
    line.match(
      asyncPatterns.unhandledPromise
    );

  if (!match) {
    return null;
  }

  if (
    isHandledPromise(line)
  ) {
    return null;
  }

  if (
    !isLikelyAsyncOperation(match)
  ) {
    return null;
  }

  return createAsyncFinding({
    rule:
      asyncRules.unhandledPromise,
    line,
    lineNumber: index + 1,
    column:
      match.index + 1,
    context
  });
}

function isLikelyAsyncOperation(match) {
  const functionName =
    match.groups?.functionName || "";

  if (!functionName) {
    return false;
  }

  return (
    asyncPatterns.asyncName.test(
      functionName
    ) ||
    asyncPatterns.promiseApi.test(
      functionName
    )
  );
}

function isHandledPromise(line) {
  return (
    asyncPatterns.await.test(line) ||
    asyncPatterns.return.test(line) ||
    asyncPatterns.then.test(line) ||
    asyncPatterns.catch.test(line) ||
    asyncPatterns.assignment.test(line) ||
    asyncPatterns.promiseAll.test(line)
  );
}

function createAsyncFinding({
  rule,
  line,
  lineNumber,
  column,
  context
}) {
  return createFinding({
    category: "bug",
    type: "async-error",
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
    analyzer: "async"
  });
}

function isComment(line) {
  return (
    line.startsWith("//") ||
    line.startsWith("/*") ||
    line.startsWith("*")
  );
}