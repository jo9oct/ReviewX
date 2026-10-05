import path from 'node:path';

import environment from '../config/environment.js';
import { AppError } from '../utils/errors.js';

const ALLOWED_SOURCE_TYPES =
  Object.freeze([
    'paste',
    'upload',
    'archive',
    'github',
  ]);

const ARCHIVE_EXTENSIONS =
  new Set([
    '.zip',
  ]);

const isPathTraversal = (
  filePath,
) => {
  if (
    typeof filePath !== 'string' ||
    !filePath
  ) {
    return true;
  }

  const normalized =
    filePath
      .replaceAll(
        '\\',
        '/',
      )
      .replace(
        /^\/+/,
        '',
      );

  if (
    normalized.includes('\0')
  ) {
    return true;
  }

  if (
    normalized.startsWith('../')
  ) {
    return true;
  }

  if (
    normalized.includes('/../')
  ) {
    return true;
  }

  if (
    normalized === '..'
  ) {
    return true;
  }

  const resolved =
    path.posix.normalize(
      normalized,
    );

  return (
    resolved === '..' ||
    resolved.startsWith(
      '../',
    )
  );
};

const assertAllowedSourceType =
  (sourceType) => {
    if (
      !ALLOWED_SOURCE_TYPES.includes(
        sourceType,
      )
    ) {
      throw new AppError({
        code:
          'SOURCE_TYPE_NOT_ALLOWED',

        message:
          'The requested source type is not supported.',

        statusCode:
          400,
      });
    }

    return true;
  };

const assertSafePath = (
  filePath,
) => {
  if (
    isPathTraversal(
      filePath,
    )
  ) {
    throw new AppError({
      code:
        'PATH_TRAVERSAL_DETECTED',

      message:
        'The submitted source path is not safe.',

      statusCode:
        400,
    });
  }

  if (
    filePath.length >
    environment.input.maxPathLength
  ) {
    throw new AppError({
      code:
        'SOURCE_PATH_TOO_LONG',

      message:
        'The source path exceeds the permitted length.',

      statusCode:
        400,
    });
  }

  return true;
};

const assertAllowedArchive =
  (filename) => {
    const extension =
      path.extname(
        String(
          filename || '',
        ).toLowerCase(),
      );

    if (
      !ARCHIVE_EXTENSIONS.has(
        extension,
      )
    ) {
      throw new AppError({
        code:
          'ARCHIVE_TYPE_NOT_ALLOWED',

        message:
          'The submitted archive format is not supported.',

        statusCode:
          415,
      });
    }

    return true;
  };

const assertSourceResourceLimits =
  ({
    files,
    maxFiles,
    maxSourceBytes,
  }) => {
    if (
      !Array.isArray(
        files,
      )
    ) {
      throw new AppError({
        code:
          'SOURCE_FILES_REQUIRED',

        message:
          'Normalized source files are required.',

        statusCode:
          400,
      });
    }

    if (
      files.length >
      maxFiles
    ) {
      throw new AppError({
        code:
          'SOURCE_FILE_LIMIT_EXCEEDED',

        message:
          'Source contains too many files.',

        statusCode:
          400,
      });
    }

    const totalBytes =
      files.reduce(
        (
          total,
          file,
        ) =>
          total +
          Buffer.byteLength(
            file?.content || '',
            'utf8',
          ),
        0,
      );

    if (
      totalBytes >
      maxSourceBytes
    ) {
      throw new AppError({
        code:
          'SOURCE_SIZE_LIMIT_EXCEEDED',

        message:
          'Source exceeds the configured size limit.',

        statusCode:
          400,
      });
    }

    return {
      fileCount:
        files.length,

      totalBytes,
    };
  };

const getSecurityLimits =
  () => {
    return Object.freeze({
      maxSourceBytes:
        environment.input
          .maxSourceBytes,

      maxArchiveBytes:
        environment.input
          .maxArchiveBytes,

      maxFilesPerSource:
        environment.input
          .maxFilesPerSource,

      maxFileBytes:
        environment.input
          .maxFileBytes,

      maxPathLength:
        environment.input
          .maxPathLength,
    });
  };

export {
  ALLOWED_SOURCE_TYPES,
  ARCHIVE_EXTENSIONS,
  isPathTraversal,
  assertAllowedSourceType,
  assertSafePath,
  assertAllowedArchive,
  assertSourceResourceLimits,
  getSecurityLimits,
};