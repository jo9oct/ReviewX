
function parseJavaScript({
  code,
  fileName = null
}) {
  return parseGenericCode({
    code,
    language: "javascript",
    fileName,
    commentPatterns: [
      /^\s*\/\//,
      /^\s*\/\*/,
      /^\s*\*/
    ],

    functionPatterns: [
      /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/,
      /\b([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
      /\b([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>/
    ],

    classPatterns: [
      /\bclass\s+([A-Za-z_$][\w$]*)/
    ]
  });
}

export { parseJavaScript };

function parseGenericCode({
  code,
  language,
  fileName,
  commentPatterns,
  functionPatterns,
  classPatterns
}) {
  const lines =
    code.split("\n");

  const structuralLines = [];
  const functions = [];
  const classes = [];
  const comments = [];

  lines.forEach(
    (rawLine, index) => {
      const lineNumber =
        index + 1;

      const text =
        rawLine.trim();

      const isComment =
        commentPatterns.some(
          (pattern) =>
            pattern.test(rawLine)
        );

      if (isComment) {
        comments.push({
          line: lineNumber,
          text
        });
      }

      if (text.length > 0) {
        structuralLines.push({
          line: lineNumber,
          text,
          indentation:
            rawLine.length -
            rawLine.trimStart().length
        });
      }

      for (const pattern of functionPatterns) {
        const match =
          rawLine.match(pattern);

        if (match) {
          functions.push({
            name:
              match[1] || "anonymous",
            line: lineNumber,
            text
          });

          break;
        }
      }

      for (const pattern of classPatterns) {
        const match =
          rawLine.match(pattern);

        if (match) {
          classes.push({
            name: match[1],
            line: lineNumber,
            text
          });

          break;
        }
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
    comments,
    imports: extractImports(
      lines,
      language
    ),
    tokens: tokenizeSource(code),
    syntax: {
      balancedBraces:
        isBalanced(code, "{", "}"),

      balancedParentheses:
        isBalanced(code, "(", ")"),

      balancedBrackets:
        isBalanced(code, "[", "]")
    }
  };
}

function extractImports(
  lines,
  language
) {
  const imports = [];

  lines.forEach(
    (line, index) => {
      const trimmed =
        line.trim();

      if (
        language === "javascript" ||
        language === "typescript"
      ) {
        if (
          /^(import|export\s+.*from)\b/.test(
            trimmed
          )
        ) {
          imports.push({
            line: index + 1,
            text: trimmed
          });
        }
      }
    }
  );

  return imports;
}

function tokenizeSource(code) {
  return code
    .split(/(\s+|[{}()[\];,.])/)
    .filter(Boolean)
    .slice(0, 10000);
}

function isBalanced(
  code,
  opening,
  closing
) {
  let depth = 0;

  for (const character of code) {
    if (character === opening) {
      depth += 1;
    }

    if (character === closing) {
      depth -= 1;

      if (depth < 0) {
        return false;
      }
    }
  }

  return depth === 0;
}