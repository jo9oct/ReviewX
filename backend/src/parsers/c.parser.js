
export function parseC({
  code,
  fileName = null
}) {
  return parseCFamily({
    code,
    fileName,
    language: "c"
  });
}

function parseCFamily({
  code,
  fileName,
  language
}) {
  const lines =
    code.split("\n");

  const functions = [];
  const structs = [];
  const includes = [];
  const comments = [];
  const structuralLines = [];

  lines.forEach(
    (rawLine, index) => {
      const lineNumber =
        index + 1;

      const text =
        rawLine.trim();

      if (text) {
        structuralLines.push({
          line: lineNumber,
          text,
          indentation:
            rawLine.length -
            rawLine.trimStart().length
        });
      }

      if (
        /^\s*(\/\/|\/\*|\*)/.test(
          rawLine
        )
      ) {
        comments.push({
          line: lineNumber,
          text
        });
      }

      if (
        /^\s*#include\b/.test(
          rawLine
        )
      ) {
        includes.push({
          line: lineNumber,
          text
        });
      }

      const functionMatch =
        rawLine.match(
          /^\s*(?:static\s+)?[\w*]+\s+([A-Za-z_]\w*)\s*\([^;]*\)\s*\{?/
        );

      if (functionMatch) {
        functions.push({
          name: functionMatch[1],
          line: lineNumber,
          text
        });
      }

      const structMatch =
        rawLine.match(
          /\bstruct\s+([A-Za-z_]\w*)/
        );

      if (structMatch) {
        structs.push({
          name: structMatch[1],
          line: lineNumber,
          text
        });
      }
    }
  );

  return {
    language,
    fileName,
    lineCount: lines.length,
    lines: structuralLines,
    functions,
    structs,
    includes,
    comments,
    tokens: tokenize(code),
    syntax: {
      balancedBraces:
        balanced(code, "{", "}"),

      balancedParentheses:
        balanced(code, "(", ")"),

      balancedBrackets:
        balanced(code, "[", "]")
    }
  };
}

function tokenize(code) {
  return code
    .split(/(\s+|[{}()[\];,.])/)
    .filter(Boolean)
    .slice(0, 10000);
}

function balanced(
  code,
  opening,
  closing
) {
  let depth = 0;

  for (const char of code) {
    if (char === opening) {
      depth++;
    }

    if (char === closing) {
      depth--;

      if (depth < 0) {
        return false;
      }
    }
  }

  return depth === 0;
}