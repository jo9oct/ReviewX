
export function parseHtml({
  code,
  fileName = null
}) {
  const lines =
    code.split("\n");

  const tags = [];
  const scripts = [];
  const styles = [];
  const comments = [];

  lines.forEach(
    (rawLine, index) => {
      const lineNumber =
        index + 1;

      const tagMatches =
        rawLine.match(
          /<\/?[A-Za-z][^>]*>/g
        ) || [];

      for (const tag of tagMatches) {
        const match =
          tag.match(
            /^<\/?\s*([A-Za-z][\w:-]*)/
          );

        if (match) {
          tags.push({
            name:
              match[1].toLowerCase(),
            line: lineNumber,
            text: tag
          });
        }
      }

      if (
        /<!--/.test(rawLine)
      ) {
        comments.push({
          line: lineNumber,
          text: rawLine.trim()
        });
      }

      if (
        /<script\b/i.test(
          rawLine
        )
      ) {
        scripts.push({
          line: lineNumber,
          text: rawLine.trim()
        });
      }

      if (
        /<style\b/i.test(
          rawLine
        )
      ) {
        styles.push({
          line: lineNumber,
          text: rawLine.trim()
        });
      }
    }
  );

  return {
    language: "html",
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
    tags,
    scripts,
    styles,
    comments,
    tokens:
      code
        .split(/(\s+|<|>|\/)/)
        .filter(Boolean)
        .slice(0, 10000),
    syntax: {
      hasDocumentDeclaration:
        /<!doctype\s+html>/i.test(code)
    }
  };
}