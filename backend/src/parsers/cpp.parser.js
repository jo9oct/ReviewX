
import { parseC } from "./c.parser.js";

export function parseCpp({
  code,
  fileName = null
}) {
  const base =
    parseC({
      code,
      fileName
    });

  const lines =
    code.split("\n");

  const namespaces = [];
  const templates = [];

  lines.forEach(
    (line, index) => {
      const namespaceMatch =
        line.match(
          /\bnamespace\s+([A-Za-z_]\w*)/
        );

      if (namespaceMatch) {
        namespaces.push({
          name: namespaceMatch[1],
          line: index + 1,
          text: line.trim()
        });
      }

      if (
        /^\s*template\s*</.test(line)
      ) {
        templates.push({
          line: index + 1,
          text: line.trim()
        });
      }
    }
  );

  return {
    ...base,
    language: "cpp",
    namespaces,
    templates
  };
}