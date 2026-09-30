import path from 'node:path';

import { AppError } from '../utils/errors.js';

const DANGEROUS_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.com',
  '.msi',
  '.scr',
  '.sys',
  '.drv',
  '.ocx',
  '.jar',
  '.class',
  '.apk',
  '.ipa',
  '.appimage'
]);

const DANGEROUS_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519'
]);

const normalizeFilename = (filename) => {
  return path.basename(String(filename || ''))
    .trim()
    .toLowerCase();
};

const isDangerousFilename = (filename) => {
  const normalized = normalizeFilename(filename);

  if (!normalized) {
    return false;
  }

  if (DANGEROUS_FILENAMES.has(normalized)) {
    return true;
  }

  return DANGEROUS_EXTENSIONS.has(
    path.extname(normalized)
  );
};

const assertSafeFilename = (filename) => {
  if (isDangerousFilename(filename)) {
    throw new AppError({
      code: 'DANGEROUS_FILE_TYPE',
      message: 'The submitted file type is not permitted.',
      statusCode: 415,
      details: {
        filename: normalizeFilename(filename)
      }
    });
  }

  return true;
};

const inspectFiles = (files) => {
  if (!Array.isArray(files)) {
    throw new AppError({
      code: 'INVALID_FILE_COLLECTION',
      message: 'The source file collection is invalid.',
      statusCode: 400
    });
  }

  for (const file of files) {
    assertSafeFilename(file?.path || file?.filename);
  }

  return true;
};

export {
  DANGEROUS_EXTENSIONS,
  DANGEROUS_FILENAMES,
  isDangerousFilename,
  assertSafeFilename,
  inspectFiles
};