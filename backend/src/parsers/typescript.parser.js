
import { parseJavaScript } from "./javascript.parser.js";

export function parseTypeScript({
  code,
  fileName = null
}) {
  const base =
    parseJavaScript({
      code,
      fileName
    });

  const lines =
    code.split("\n");

  const interfaces = [];
  const types = [];
  const enums = [];

  lines.forEach(
    (line, index) => {
      const lineNumber =
        index + 1;

      const interfaceMatch =
        line.match(
          /\binterface\s+([A-Za-z_$][\w$]*)/
        );

      if (interfaceMatch) {
        interfaces.push({
          name: interfaceMatch[1],
          line: lineNumber,
          text: line.trim()
        });
      }

      const typeMatch =
        line.match(
          /\btype\s+([A-Za-z_$][\w$]*)\s*=/
        );

      if (typeMatch) {
        types.push({
          name: typeMatch[1],
          line: lineNumber,
          text: line.trim()
        });
      }

      const enumMatch =
        line.match(
          /\benum\s+([A-Za-z_$][\w$]*)/
        );

      if (enumMatch) {
        enums.push({
          name: enumMatch[1],
          line: lineNumber,
          text: line.trim()
        });
      }
    }
  );

  return {
    ...base,
    language: "typescript",
    interfaces,
    types,
    enums
  };
}