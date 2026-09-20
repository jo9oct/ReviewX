
export function parseJava({
  code,
  fileName = null
}) {
  return parseCStyleLanguage({
    code,
    fileName,
    language: "java",
    functionPattern:
      /(?:public|private|protected|static|\s)+\s+[\w<>\[\]]+\s+(\w+)\s*\(/,
    classPattern:
      /\bclass\s+(\w+)/,
    importPattern:
      /^\s*import\s+/
  });
}

function parseCStyleLanguage({
  code,
  fileName,
  language,
  functionPattern,
  classPattern,
  importPattern
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

      const functionMatch =
        rawLine.match(
          functionPattern
        );

      if (functionMatch) {
        functions.push({
          name: functionMatch[1],
          line: lineNumber,
          text
        });
      }

      const classMatch =
        rawLine.match(classPattern);

      if (classMatch) {
        classes.push({
          name: classMatch[1],
          line: lineNumber,
          text
        });
      }

      if (
        importPattern.test(rawLine)
      ) {
        imports.push({
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
    classes,
    imports,
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