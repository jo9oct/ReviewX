
export function parsePython({
  code,
  fileName = null
}) {
  const lines =
    code.split("\n");

  const functions = [];
  const classes = [];
  const imports = [];
  const comments = [];
  const structuralLines = [];

  lines.forEach(
    (rawLine, index) => {
      const lineNumber =
        index + 1;

      const text =
        rawLine.trim();

      if (text.length > 0) {
        structuralLines.push({
          line: lineNumber,
          text,
          indentation:
            rawLine.length -
            rawLine.trimStart().length
        });
      }

      if (text.startsWith("#")) {
        comments.push({
          line: lineNumber,
          text
        });
      }

      const functionMatch =
        rawLine.match(
          /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/
        );

      if (functionMatch) {
        functions.push({
          name: functionMatch[1],
          line: lineNumber,
          text
        });
      }

      const classMatch =
        rawLine.match(
          /^\s*class\s+([A-Za-z_]\w*)/
        );

      if (classMatch) {
        classes.push({
          name: classMatch[1],
          line: lineNumber,
          text
        });
      }

      if (
        /^\s*(?:from\s+\S+\s+)?import\s+/.test(
          rawLine
        )
      ) {
        imports.push({
          line: lineNumber,
          text
        });
      }
    }
  );

  return {
    language: "python",
    fileName,
    lineCount: lines.length,
    lines: structuralLines,
    functions,
    classes,
    imports,
    comments,
    tokens: tokenize(code),
    syntax: {
      indentationConsistent:
        checkIndentation(lines)
    }
  };
}

function tokenize(code) {
  return code
    .split(/(\s+|[()[\]{},.:])/)
    .filter(Boolean)
    .slice(0, 10000);
}

function checkIndentation(lines) {
  const indents =
    lines
      .filter((line) => line.trim())
      .map(
        (line) =>
          line.length -
          line.trimStart().length
      );

  if (indents.length === 0) {
    return true;
  }

  return indents.every(
    (indent) =>
      Number.isInteger(indent)
  );
}