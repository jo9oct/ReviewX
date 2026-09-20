
import path from "node:path";

import {
  BadRequestError
} from "./errors.js";

import { uploadConfig } from "../config/upload.js";

export function getSafeExtension(
  filename
) {
  if (
    typeof filename !== "string" ||
    filename.length === 0
  ) {
    throw new BadRequestError(
      "A valid filename is required."
    );
  }

  const extension = path
    .extname(filename)
    .toLowerCase();

  if (
    !uploadConfig.allowedExtensions.includes(
      extension
    )
  ) {
    throw new BadRequestError(
      `Unsupported file extension: ${extension || "none"}.`
    );
  }

  return extension;
}

export function getSafeBaseName(
  filename
) {
  const baseName = path.basename(filename);

  if (
    baseName !== filename ||
    baseName.includes("\0")
  ) {
    throw new BadRequestError(
      "Invalid filename."
    );
  }

  return baseName;
}

export function getFileExtension(
  filename
) {
  return path
    .extname(filename)
    .toLowerCase();
}