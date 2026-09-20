
import { parseJavaScript } from "./javascript.parser.js";
import { parseTypeScript } from "./typescript.parser.js";
import { parsePython } from "./python.parser.js";
import { parseJava } from "./java.parser.js";
import { parseCSharp } from "./csharp.parser.js";
import { parsePhp } from "./php.parser.js";
import { parseC } from "./c.parser.js";
import { parseCpp } from "./cpp.parser.js";
import { parseHtml } from "./html.parser.js";
import { parseCss } from "./css.parser.js";
import { parseSql } from "./sql.parser.js";

import {
  BadRequestError
} from "../utils/errors.js";

const parsers = Object.freeze({
  javascript: parseJavaScript,
  typescript: parseTypeScript,
  python: parsePython,
  java: parseJava,
  csharp: parseCSharp,
  php: parsePhp,
  c: parseC,
  cpp: parseCpp,
  html: parseHtml,
  css: parseCss,
  sql: parseSql
});

export function getParser(language) {
  const parser =
    parsers[language];

  if (!parser) {
    throw new BadRequestError(
      `No parser is available for language: ${language}.`
    );
  }

  return parser;
}

export function parseSource({
  code,
  language,
  fileName = null
}) {
  if (
    typeof code !== "string" ||
    code.length === 0
  ) {
    throw new BadRequestError(
      "Source code cannot be empty."
    );
  }

  const parser =
    getParser(language);

  return parser({
    code,
    fileName
  });
}