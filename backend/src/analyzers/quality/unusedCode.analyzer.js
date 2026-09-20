
import {
  createFinding
} from "../../analysis/findingFactory.js";

const DECLARATION_PATTERN =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/;

const FUNCTION_PATTERN =
  /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/;

const IMPORT_PATTERN =
  /^\s*import\s+(?:(?:\{([^}]+)\})|([A-Za-z_$][\w$]*))\s+from\s+["'`]/;

export function analyzeUnusedCode(
  context
) {
  if (!context?.code) {
    return [];
  }

  const lines =
    context.code.split("\n");

  const findings = [];

  findings.push(
    ...findUnusedVariables({
      lines,
      fileName: context.fileName
    })
  );

  findings.push(
    ...findUnusedImports({
      lines,
      fileName: context.fileName
    })
  );

  findings.push(
    ...findUnusedFunctions({
      lines,
      fileName: context.fileName
    })
  );

  return findings;
}

function findUnusedVariables({
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
        DECLARATION_PATTERN
      );

    if (!match) {
      continue;
    }

    const name =
      match[1];

    const remainingSource =
      lines
        .slice(index + 1)
        .join("\n");

    const references =
      countIdentifierReferences(
        remainingSource,
        name
      );

    if (references > 0) {
      continue;
    }

    if (
      isIntentionallyIgnored(name)
    ) {
      continue;
    }

    findings.push(
      createUnusedFinding({
        ruleId:
          "QUALITY-UNUSED-001",
        title:
          "Declared variable appears to be unused.",
        description:
          `The variable "${name}" is declared but no later reference was detected in the source.`,
        line,
        lineNumber:
          index + 1,
        fileName,
        column:
          match.index + 1,
        severity: "low",
        confidence: "medium",
        recommendation:
          "Remove the unused variable or use it where required. If the declaration is intentionally retained, document why it is needed."
      })
    );
  }

  return findings;
}

function findUnusedImports({
  lines,
  fileName
}) {
  const findings = [];

  const source =
    lines.join("\n");

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    const match =
      line.match(
        IMPORT_PATTERN
      );

    if (!match) {
      continue;
    }

    const namedImports =
      match[1];

    const defaultImport =
      match[2];

    const names = [];

    if (defaultImport) {
      names.push(
        defaultImport.trim()
      );
    }

    if (namedImports) {
      for (
        const item of namedImports.split(",")
      ) {
        const name =
          item
            .trim()
            .split(/\s+as\s+/i)[0]
            .trim();

        if (name) {
          names.push(name);
        }
      }
    }

    for (const name of names) {
      const withoutImport =
        source.replace(
          line,
          ""
        );

      if (
        countIdentifierReferences(
          withoutImport,
          name
        ) > 0
      ) {
        continue;
      }

      findings.push(
        createUnusedFinding({
          ruleId:
            "QUALITY-UNUSED-002",
          title:
            "Imported identifier appears to be unused.",
          description:
            `The imported identifier "${name}" is not referenced elsewhere in the source.`,
          line,
          lineNumber:
            index + 1,
          fileName,
          column:
            line.indexOf(name) + 1,
          severity: "low",
          confidence: "medium",
          recommendation:
            "Remove unused imports to reduce unnecessary dependencies and keep the module clean."
        })
      );
    }
  }

  return findings;
}

function findUnusedFunctions({
  lines,
  fileName
}) {
  const findings = [];

  const source =
    lines.join("\n");

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    const match =
      line.match(
        FUNCTION_PATTERN
      );

    if (!match) {
      continue;
    }

    const functionName =
      match[1];

    const sourceWithoutDeclaration =
      lines
        .filter(
          (_, lineIndex) =>
            lineIndex !== index
        )
        .join("\n");

    if (
      countIdentifierReferences(
        sourceWithoutDeclaration,
        functionName
      ) > 0
    ) {
      continue;
    }

    if (
      isExportedFunction(
        line
      )
    ) {
      continue;
    }

    findings.push(
      createUnusedFinding({
        ruleId:
          "QUALITY-UNUSED-003",
        title:
          "Function appears to be unused.",
        description:
          `The function "${functionName}" has no detected reference outside its declaration.`,
        line,
        lineNumber:
          index + 1,
        fileName,
        column:
          match.index + 1,
        severity: "low",
        confidence: "low",
        recommendation:
          "Remove unused functions or ensure that the function is intentionally part of the module's public interface."
      })
    );
  }

  return findings;
}

function createUnusedFinding({
  ruleId,
  title,
  description,
  line,
  lineNumber,
  fileName,
  column,
  severity,
  confidence,
  recommendation
}) {
  return createFinding({
    category: "quality",
    type: "unused-code",
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
        type: "pattern",
        file: fileName,
        line: lineNumber,
        column,
        code: line,
        description
      }
    ],
    recommendation,
    analyzer: "unused-code"
  });
}

function countIdentifierReferences(
  source,
  identifier
) {
  if (!identifier) {
    return 0;
  }

  const escaped =
    identifier.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const matches =
    source.match(
      new RegExp(
        `\\b${escaped}\\b`,
        "g"
      )
    );

  return matches
    ? matches.length
    : 0;
}

function isIntentionallyIgnored(
  name
) {
  return (
    name === "_" ||
    name.startsWith("_")
  );
}

function isExportedFunction(
  line
) {
  return (
    /\bexport\b/.test(line) ||
    /\bmodule\.exports\b/.test(line)
  );
}