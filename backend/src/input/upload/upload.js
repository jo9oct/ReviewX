import {
  assertFileSize
} from '../../security/sourceLimits.js';

import {
  assertSafeFilename
} from '../../security/dangerousFileDetector.js';

import {
  assertSafePath
} from '../../security/securityPolicy.js';

import { AppError } from '../../utils/errors.js';

const normalizeUploadedFile = (file) => {
  if (!file || typeof file !== 'object') {
    throw new AppError({
      code: 'INVALID_UPLOAD',
      message: 'The uploaded file is invalid.',
      statusCode: 400
    });
  }

  const filename = file.filename || file.originalname;

  if (typeof filename !== 'string' || !filename.trim()) {
    throw new AppError({
      code: 'UPLOAD_FILENAME_REQUIRED',
      message: 'The uploaded file must have a filename.',
      statusCode: 400
    });
  }

  assertSafeFilename(filename);

  const filePath = file.path || filename;

  assertSafePath(filePath);

  if (!Buffer.isBuffer(file.buffer)) {
    throw new AppError({
      code: 'UPLOAD_BUFFER_REQUIRED',
      message: 'The uploaded file content must be provided as a buffer.',
      statusCode: 400
    });
  }

  assertFileSize(file.buffer.byteLength);

  return Object.freeze({
    path: filePath,
    filename,
    content: file.buffer.toString('utf8'),
    byteLength: file.buffer.byteLength
  });
};

const normalizeUploadedFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError({
      code: 'UPLOAD_FILES_REQUIRED',
      message: 'At least one uploaded file is required.',
      statusCode: 400
    });
  }

  return files.map(normalizeUploadedFile);
};

export {
  normalizeUploadedFile,
  normalizeUploadedFiles
};