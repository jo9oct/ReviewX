import path from "node:path";

import {
  BadRequestError
} from "../utils/errors.js";

import {
  normalizeSourceCode,
  isEmptySource,
  getSourceSize
} from "../utils/code.js";

import {
  getSafeBaseName,
  getSafeExtension
} from "../utils/file.js";

import { uploadConfig } from "../config/upload.js";

export function processUploadedFile(
  file
) {
  if (!file) {
    throw new BadRequestError(
      "Source-code file is required."
    );
  }

  if (!Buffer.isBuffer(file.buffer)) {
    throw new BadRequestError(
      "Uploaded file data is invalid."
    );
  }

  if (
    file.buffer.length === 0
  ) {
    throw new BadRequestError(
      "Uploaded source file is empty."
    );
  }

  if (
    file.buffer.length >
    uploadConfig.maxFileSize
  ) {
    throw new BadRequestError(
      "Uploaded source file exceeds the configured size limit."
    );
  }

  const originalName =
    String(file.originalname || "");

  if (
    originalName.includes("/") ||
    originalName.includes("\\") ||
    originalName.includes("\0")
  ) {
    throw new BadRequestError(
      "Invalid source filename."
    );
  }

  const fileName =
    getSafeBaseName(originalName);

  const extension =
    getSafeExtension(fileName);

  let sourceCode;

  try {
    sourceCode =
      file.buffer.toString(
        uploadConfig.encoding
      );
  } catch {
    throw new BadRequestError(
      "Uploaded file could not be decoded as text."
    );
  }

  sourceCode =
    normalizeSourceCode(sourceCode);

  if (isEmptySource(sourceCode)) {
    throw new BadRequestError(
      "Uploaded source file is empty."
    );
  }

  const sourceSize =
    getSourceSize(sourceCode);

  if (
    sourceSize >
    uploadConfig.maxFileSize
  ) {
    throw new BadRequestError(
      "Decoded source code exceeds the configured size limit."
    );
  }

  return Object.freeze({
    source: "upload",
    fileName,
    extension,
    mimeType: file.mimetype,
    sourceCode,
    sourceSize
  });
}

export function processPastedCode({
  code,
  fileName = null
}) {
  const sourceCode =
    normalizeSourceCode(code);

  if (isEmptySource(sourceCode)) {
    throw new BadRequestError(
      "Source code cannot be empty."
    );
  }

  const sourceSize =
    getSourceSize(sourceCode);

  if (
    sourceSize >
    uploadConfig.maxFileSize
  ) {
    throw new BadRequestError(
      "Pasted source code exceeds the configured size limit."
    );
  }

  let extension = null;

  if (fileName) {
    extension =
      path.extname(fileName).toLowerCase();

    getSafeExtension(fileName);
  }

  return Object.freeze({
    source: "paste",
    fileName,
    extension,
    mimeType: "text/plain",
    sourceCode,
    sourceSize
  });
}

export async function processReviewInput({
  input = {},
  file = null,
  maxSourceSize =
    uploadConfig.maxFileSize
}) {
  const processed = file
    ? processUploadedFile(file)
    : processPastedCode({
        code: input.code,
        fileName:
          input.fileName || null
      });

  if (
    processed.sourceSize >
    maxSourceSize
  ) {
    throw new BadRequestError(
      "Source code exceeds the allowed analysis size."
    );
  }

  return Object.freeze({
    sourceType:
      processed.source,
    fileName:
      processed.fileName,
    fileExtension:
      processed.extension,
    language:
      input.language || null,
    code:
      processed.sourceCode,
    sourceSize:
      processed.sourceSize,
    companyRules:
      Array.isArray(input.companyRules)
        ? input.companyRules
        : []
  });
}