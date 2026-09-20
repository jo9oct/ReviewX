
import {
  BadRequestError
} from "./errors.js";

export function normalizeSourceCode(
  source
) {
  if (
    typeof source !== "string"
  ) {
    throw new BadRequestError(
      "Source code must be text."
    );
  }

  if (
    source.includes("\0")
  ) {
    throw new BadRequestError(
      "Source code contains an invalid null character."
    );
  }

  return source
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

export function isEmptySource(
  source
) {
  return (
    typeof source !== "string" ||
    source.trim().length === 0
  );
}

export function getSourceSize(
  source
) {
  return Buffer.byteLength(
    source,
    "utf8"
  );
}