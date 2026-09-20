
export function parseCss({
  code,
  fileName = null
}) {
  const lines =
    code.split("\n");

  const selectors = [];
  const declarations = [];
  const comments = [];

  lines.forEach(
    (rawLine, index) => {
      const lineNumber =
        index + 1;

      const text =
        rawLine.trim();

      if (
        text.startsWith("/*")
      ) {
        comments.push({
          line: lineNumber,
          text
        });
      }

      const selectorMatch =
        text.match(
          /^([^{}]+)\s*\{/
        );

      if (selectorMatch) {
        selectors.push({
          selector:
            selectorMatch[1].trim(),
          line: lineNumber
        });
      }

      const declarationMatch =
        text.match(
          /^([\w-]+)\s*:\s*(.+?);?$/
        );

      if (declarationMatch) {
        declarations.push({
          property:
            declarationMatch[1],
          value:
            declarationMatch[2],
          line: lineNumber
        });
      }
    }
  );

  return {
    language: "css",
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
    selectors,
    declarations,
    comments,
    tokens:
      code
        .split(/(\s+|[{}:;,])/)
        .filter(Boolean)
        .slice(0, 10000),
    syntax: {
      balancedBraces:
        balanced(code, "{", "}")
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