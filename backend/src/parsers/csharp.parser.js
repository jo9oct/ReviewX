
import { parseJava } from "./java.parser.js";

export function parseCSharp({
  code,
  fileName = null
}) {
  const base =
    parseJava({
      code,
      fileName
    });

  return {
    ...base,
    language: "csharp"
  };
}