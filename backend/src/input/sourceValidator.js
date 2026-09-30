import { AppError } from '../utils/errors.js';
import {
  assertAllowedSourceType,
  assertSafePath
} from '../security/securityPolicy.js';
import {
  assertFileCount,
  assertSourceSize
} from '../security/sourceLimits.js';
import { inspectFiles } from '../security/dangerousFileDetector.js';

const validateSourceCollection = (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError({
      code: 'SOURCE_FILES_REQUIRED',
      message: 'At least one source file is required.',
      statusCode: 400
    });
  }

  assertFileCount(files.length);
  inspectFiles(files);

  let totalBytes = 0;

  for (const file of files) {
    if (
      !file ||
      typeof file.path !== 'string' ||
      typeof file.content !== 'string'
    ) {
      throw new AppError({
        code: 'INVALID_SOURCE_FILE',
        message: 'Each source file must contain a path and text content.',
        statusCode: 400
      });
    }

    assertSafePath(file.path);

    totalBytes += Buffer.byteLength(
      file.content,
      'utf8'
    );
  }

  assertSourceSize(totalBytes);

  return true;
};

const validateNormalizedSource = (source) => {
  if (!source || typeof source !== 'object') {
    throw new AppError({
      code: 'INVALID_NORMALIZED_SOURCE',
      message: 'The normalized source is invalid.',
      statusCode: 400
    });
  }

  assertAllowedSourceType(source.type);
  validateSourceCollection(source.files);

  return true;
};

export {
  validateSourceCollection,
  validateNormalizedSource
};