
import path from "node:path";

import { parserConfig } from "../config/parser.js";
import { BadRequestError } from "../utils/errors.js";

const extensionMap =
  parserConfig.extensionMap;

export function detectLanguage({
  code,
  fileName = null,
  language = null
}) {
  if (
    typeof code !== "string" ||
    code.trim().length === 0
  ) {
    throw new BadRequestError(
      "Source code is required for language detection."
    );
  }

  if (language) {
    const normalizedLanguage =
      normalizeLanguage(language);

    if (
      parserConfig.supportedLanguages.includes(
        normalizedLanguage
      )
    ) {
      return normalizedLanguage;
    }

    throw new BadRequestError(
      `Unsupported language: ${language}.`
    );
  }

  if (fileName) {
    const extension =
      path.extname(fileName).toLowerCase();

    const detected =
      extensionMap[extension];

    if (detected) {
      return detected;
    }

    throw new BadRequestError(
      `Unable to detect language from extension: ${extension || "none"}.`
    );
  }

  const detected =
    detectFromContent(code);

  if (detected) {
    return detected;
  }

  throw new BadRequestError(
    "Unable to detect the source-code language."
  );
}

export function normalizeLanguage(
  language
) {
  const normalized =
    String(language)
      .trim()
      .toLowerCase();

  const aliases = {
    js: "javascript",
    jsx: "javascript",
    node: "javascript",
    nodejs: "javascript",

    ts: "typescript",
    tsx: "typescript",

    py: "python",

    cs: "csharp",
    "c#": "csharp",

    c: "c",
    "c++": "cpp",

    html: "html",

    css: "css",

    sql: "sql"
  };

  return aliases[normalized] || normalized;
}

function detectFromContent(code) {
  const sample =
    code.slice(0, 12000);

  if (
    /<(!DOCTYPE|html|head|body|div|script)\b/i.test(
      sample
    )
  ) {
    return "html";
  }

  if (
    /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/im.test(
      sample
    )
  ) {
    return "sql";
  }

  if (
    /^\s*(def|class)\s+\w+/m.test(sample) ||
    /^\s*import\s+\w+/m.test(sample) &&
      /:\s*$/m.test(sample)
  ) {
    return "python";
  }

  if (
    /\b(interface|type|enum)\s+\w+/m.test(
      sample
    )
  ) {
    return "typescript";
  }

  if (
    /\b(public|private|protected)\s+(class|interface)\s+\w+/m.test(
      sample
    )
  ) {
    return "java";
  }

  if (
    /\bnamespace\s+\w+/m.test(sample) &&
    /\busing\s+\w+/m.test(sample)
  ) {
    return "csharp";
  }

  if (
    /#include\s*<[^>]+>/.test(sample)
  ) {
    if (
      /\b(std::|template\s*<)/.test(sample)
    ) {
      return "cpp";
    }

    return "c";
  }

  if (
    /<\?php\b/i.test(sample)
  ) {
    return "php";
  }

  if (
    /(^|\n)\s*[.#]?[a-zA-Z][\w-]*\s*\{[^}]*:[^}]*\}/s.test(
      sample
    )
  ) {
    return "css";
  }

  if (
    /\b(const|let|var|function|=>)\b/.test(
      sample
    )
  ) {
    return "javascript";
  }

  return null;
}