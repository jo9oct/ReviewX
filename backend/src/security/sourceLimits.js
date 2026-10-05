import environment from '../config/environment.js';
import { AppError } from '../utils/errors.js';

const assertSourceSize = (
  byteLength,
  {
    maximum = environment.input.maxSourceBytes,
    code = 'SOURCE_SIZE_LIMIT_EXCEEDED'
  } = {}
) => {
  if (!Number.isInteger(byteLength) || byteLength < 0) {
    throw new AppError({
      code: 'INVALID_SOURCE_SIZE',
      message: 'The source size is invalid.',
      statusCode: 400
    });
  }

  if (byteLength > maximum) {
    throw new AppError({
      code,
      message: 'The submitted source exceeds the permitted size.',
      statusCode: 413,
      details: {
        maximum,
        received: byteLength
      }
    });
  }

  return true;
};

const assertFileCount = (fileCount) => {
  if (!Number.isInteger(fileCount) || fileCount < 0) {
    throw new AppError({
      code: 'INVALID_FILE_COUNT',
      message: 'The source file count is invalid.',
      statusCode: 400
    });
  }

  if (fileCount > environment.input.maxFilesPerSource) {
    throw new AppError({
      code: 'SOURCE_FILE_COUNT_LIMIT_EXCEEDED',
      message: 'The source contains too many files.',
      statusCode: 413,
      details: {
        maximum: environment.input.maxFilesPerSource,
        received: fileCount
      }
    });
  }

  return true;
};

const assertFileSize = (byteLength) => {
  return assertSourceSize(byteLength, {
    maximum: environment.input.maxFileBytes,
    code: 'SOURCE_FILE_SIZE_LIMIT_EXCEEDED'
  });
};

const assertPathLength = (filePath) => {
  if (
    typeof filePath !== 'string' ||
    filePath.length > environment.input.maxPathLength
  ) {
    throw new AppError({
      code: 'SOURCE_PATH_TOO_LONG',
      message: 'The source path exceeds the permitted length.',
      statusCode: 400
    });
  }

  return true;
};

export {
  assertSourceSize,
  assertFileCount,
  assertFileSize,
  assertPathLength
};