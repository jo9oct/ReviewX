import {
  assertSourceSize,
  assertFileCount,
  assertFileSize
} from '../../security/sourceLimits.js';

import {
  assertAllowedArchive,
  assertSafePath
} from '../../security/securityPolicy.js';

import {
  assertSafeFilename
} from '../../security/dangerousFileDetector.js';

import { AppError } from '../../utils/errors.js';

const validateArchive = ({
  filename,
  buffer
}) => {
  if (
    typeof filename !== 'string' ||
    !filename.trim()
  ) {
    throw new AppError({
      code: 'ARCHIVE_FILENAME_REQUIRED',
      message: 'An archive filename is required.',
      statusCode: 400
    });
  }

  assertAllowedArchive(filename);
  assertSafeFilename(filename);

  if (!Buffer.isBuffer(buffer)) {
    throw new AppError({
      code: 'ARCHIVE_BUFFER_REQUIRED',
      message: 'The archive content must be provided as a buffer.',
      statusCode: 400
    });
  }

  assertSourceSize(buffer.byteLength, {
    maximum: Number.parseInt(
      process.env.MAX_ARCHIVE_BYTES || '10485760',
      10
    ),
    code: 'ARCHIVE_SIZE_LIMIT_EXCEEDED'
  });

  return true;
};

const validateArchiveEntry = ({
  path,
  byteLength
}) => {
  if (typeof path !== 'string' || !path) {
    throw new AppError({
      code: 'ARCHIVE_ENTRY_PATH_REQUIRED',
      message: 'The archive entry path is required.',
      statusCode: 400
    });
  }

  assertSafePath(path);
  assertSafeFilename(path);

  if (
    !Number.isInteger(byteLength) ||
    byteLength < 0
  ) {
    throw new AppError({
      code: 'INVALID_ARCHIVE_ENTRY_SIZE',
      message: 'The archive entry size is invalid.',
      statusCode: 400
    });
  }

  assertFileSize(byteLength);

  return true;
};

const validateArchiveEntries = (entries) => {
  if (!Array.isArray(entries)) {
    throw new AppError({
      code: 'INVALID_ARCHIVE_ENTRIES',
      message: 'The archive entries are invalid.',
      statusCode: 400
    });
  }

  assertFileCount(entries.length);

  for (const entry of entries) {
    validateArchiveEntry(entry);
  }

  return true;
};

export {
  validateArchive,
  validateArchiveEntry,
  validateArchiveEntries
};