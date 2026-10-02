import unzipper from 'unzipper';

import {
  assertSourceSize,
  assertFileCount,
  assertFileSize,
} from '../../security/sourceLimits.js';

import {
  assertAllowedArchive,
  assertSafePath,
} from '../../security/securityPolicy.js';

import {
  assertSafeFilename,
} from '../../security/dangerousFileDetector.js';

import {
  AppError,
} from '../../utils/errors.js';

const getArchiveMaximumBytes = () => {
  const maximum =
    Number.parseInt(
      process.env.MAX_ARCHIVE_BYTES || '10485760',
      10,
    );

  if (
    !Number.isInteger(maximum) ||
    maximum <= 0
  ) {
    throw new AppError({
      code: 'INVALID_ARCHIVE_SIZE_LIMIT',
      message:
        'The configured archive size limit is invalid.',
      statusCode: 500,
    });
  }

  return maximum;
};

const validateArchive = ({
  filename,
  buffer,
}) => {
  if (
    typeof filename !== 'string' ||
    !filename.trim()
  ) {
    throw new AppError({
      code: 'ARCHIVE_FILENAME_REQUIRED',
      message:
        'An archive filename is required.',
      statusCode: 400,
    });
  }

  assertAllowedArchive(filename);
  assertSafeFilename(filename);

  if (!Buffer.isBuffer(buffer)) {
    throw new AppError({
      code: 'ARCHIVE_BUFFER_REQUIRED',
      message:
        'The archive content must be provided as a buffer.',
      statusCode: 400,
    });
  }

  assertSourceSize(
    buffer.byteLength,
    {
      maximum:
        getArchiveMaximumBytes(),

      code:
        'ARCHIVE_SIZE_LIMIT_EXCEEDED',
    },
  );

  return true;
};

const validateArchiveEntry = ({
  path,
  byteLength,
}) => {
  if (
    typeof path !== 'string' ||
    !path
  ) {
    throw new AppError({
      code: 'ARCHIVE_ENTRY_PATH_REQUIRED',
      message:
        'The archive entry path is required.',
      statusCode: 400,
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
      message:
        'The archive entry size is invalid.',
      statusCode: 400,
    });
  }

  assertFileSize(byteLength);

  return true;
};

const validateArchiveEntries = (
  entries,
) => {
  if (!Array.isArray(entries)) {
    throw new AppError({
      code: 'INVALID_ARCHIVE_ENTRIES',
      message:
        'The archive entries are invalid.',
      statusCode: 400,
    });
  }

  assertFileCount(
    entries.length,
  );

  for (
    const entry of entries
  ) {
    validateArchiveEntry(entry);
  }

  return true;
};

const extractArchive = async ({
  filename,
  buffer,
}) => {
  validateArchive({
    filename,
    buffer,
  });

  let directory;

  try {
    directory =
      await unzipper.Open.buffer(
        buffer,
      );
  } catch (error) {
    throw new AppError({
      code: 'INVALID_ARCHIVE',
      message:
        'The uploaded archive could not be read as a valid ZIP archive.',
      statusCode: 400,
      details: {
        reason:
          error instanceof Error
            ? error.message
            : 'Unknown archive parsing error.',
      },
    });
  }

  const files = [];

  for (
    const entry of directory.files
  ) {
    const path =
      typeof entry.path === 'string'
        ? entry.path.replaceAll(
            '\\',
            '/',
          )
        : '';

    if (!path) {
      throw new AppError({
        code: 'ARCHIVE_ENTRY_PATH_REQUIRED',
        message:
          'An archive entry has no valid path.',
        statusCode: 400,
      });
    }

    const isDirectory =
      entry.type === 'Directory' ||
      path.endsWith('/');

    if (isDirectory) {
      continue;
    }

    const content =
      await entry.buffer();

    validateArchiveEntry({
      path,
      byteLength:
        content.byteLength,
    });

    files.push({
      path,
      filename: path,
      content:
        content.toString('utf8'),
    });
  }

  validateArchiveEntries(
    files.map((file) => ({
      path: file.path,
      byteLength:
        Buffer.byteLength(
          file.content,
          'utf8',
        ),
    })),
  );

  if (files.length === 0) {
    throw new AppError({
      code: 'ARCHIVE_EMPTY',
      message:
        'The uploaded archive does not contain any files.',
      statusCode: 400,
    });
  }

  return Object.freeze({
    type: 'archive',
    filename,
    files,
  });
};

export {
  validateArchive,
  validateArchiveEntry,
  validateArchiveEntries,
  extractArchive,
};