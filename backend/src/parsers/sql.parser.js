
export function parseSql({
  code,
  fileName = null
}) {
  const lines =
    code.split("\n");

  const statements = [];
  const tables = [];
  const comments = [];

  const statementPattern =
    /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i;

  lines.forEach(
    (rawLine, index) => {
      const lineNumber =
        index + 1;

      const text =
        rawLine.trim();

      if (
        text.startsWith("--") ||
        text.startsWith("/*")
      ) {
        comments.push({
          line: lineNumber,
          text
        });
      }

      const statementMatch =
        rawLine.match(
          statementPattern
        );

      if (statementMatch) {
        statements.push({
          type:
            statementMatch[1]
              .toUpperCase(),
          line: lineNumber,
          text
        });
      }

      const tableMatches =
        rawLine.matchAll(
          /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+["`]?([A-Za-z_][\w$]*)["`]?/gi
        );

      for (const match of tableMatches) {
        tables.push({
          name: match[1],
          line: lineNumber
        });
      }
    }
  );

  return {
    language: "sql",
    fileName,
    lineCount: lines.length,
    lines: lines
      .map((text, index) => ({
        line: index + 1,
        text: text.trim()
      }))
      .filter(
        (item) => item.text.length > 0
      ),
    statements,
    tables,
    comments,
    tokens:
      code
        .split(/(\s+|[,();])/)
        .filter(Boolean)
        .slice(0, 10000),
    syntax: {
      balancedParentheses:
        balanced(code, "(", ")")
    }
  };
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