import crypto from 'node:crypto';

import {
  sanitizePath,
  sanitizeSourceText,
} from '../security/inputSanitizer.js';

import {
  assertFileCount,
  assertFileSize,
  assertSourceSize,
} from '../security/sourceLimits.js';

import {
  assertAllowedSourceType,
  assertSafePath,
} from '../security/securityPolicy.js';

import {
  assertSafeFilename,
  inspectFiles,
} from '../security/dangerousFileDetector.js';

import {
  AppError,
} from '../utils/errors.js';

const createSourceHash = (
  content,
) => {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
};

const normalizeFile = (
  file,
) => {
  if (
    !file ||
    typeof file !== 'object'
  ) {
    throw new AppError({
      code:
        'INVALID_SOURCE_FILE',

      message:
        'The source file is invalid.',

      statusCode: 400,
    });
  }

  const filePath =
    sanitizePath(
      file.path ||
        file.filename,
    );

  assertSafePath(
    filePath,
  );

  assertSafeFilename(
    filePath,
  );

  const content =
    sanitizeSourceText(
      file.content,
    );

  const byteLength =
    Buffer.byteLength(
      content,
      'utf8',
    );

  assertFileSize(
    byteLength,
  );

  return Object.freeze({
    path: filePath,

    content,

    byteLength,

    hash:
      createSourceHash(
        content,
      ),
  });
};

const normalizeSourceFiles = (
  files,
) => {
  if (
    !Array.isArray(files)
  ) {
    throw new AppError({
      code:
        'SOURCE_FILES_REQUIRED',

      message:
        'Source files are required.',

      statusCode: 400,
    });
  }

  assertFileCount(
    files.length,
  );

  inspectFiles(
    files,
  );

  const normalizedFiles =
    files.map(
      normalizeFile,
    );

  const totalBytes =
    normalizedFiles.reduce(
      (
        total,
        file,
      ) =>
        total +
        file.byteLength,
      0,
    );

  assertSourceSize(
    totalBytes,
  );

  return normalizedFiles;
};

const normalizePastedSource = (
  source,
) => {
  assertAllowedSourceType(
    'paste',
  );

  const content =
    sanitizeSourceText(
      source.content,
    );

  const byteLength =
    Buffer.byteLength(
      content,
      'utf8',
    );

  assertSourceSize(
    byteLength,
  );

  const file =
    normalizeFile({
      path:
        source.filename ||
        'source.txt',

      content,
    });

  return Object.freeze({
    type: 'paste',

    files: [
      file,
    ],

    totalFiles: 1,

    totalBytes:
      byteLength,
  });
};

const normalizeRepositoryFiles = (
  repository,
) => {
  if (
    !repository ||
    typeof repository !==
      'object'
  ) {
    throw new AppError({
      code:
        'INVALID_REPOSITORY_SOURCE',

      message:
        'The normalized repository source is invalid.',

      statusCode: 400,
    });
  }

  const files =
    normalizeSourceFiles(
      repository.files ||
        [],
    );

  return Object.freeze({
    ...repository,

    type: 'github',

    files,

    totalFiles:
      files.length,

    totalBytes:
      files.reduce(
        (
          total,
          file,
        ) =>
          total +
          file.byteLength,
        0,
      ),
  });
};

const normalizeSource = async (
  source,
  context = {},
) => {
  if (
    !source ||
    typeof source !==
      'object'
  ) {
    throw new AppError({
      code:
        'INVALID_SOURCE',

      message:
        'The source input is invalid.',

      statusCode: 400,
    });
  }

  assertAllowedSourceType(
    source.type,
  );

  switch (
    source.type
  ) {
    case 'paste': {
      return normalizePastedSource(
        source,
      );
    }

    case 'upload': {
      const files =
        normalizeSourceFiles(
          source.files ||
            [],
        );

      return Object.freeze({
        type: 'upload',

        files,

        totalFiles:
          files.length,

        totalBytes:
          files.reduce(
            (
              total,
              file,
            ) =>
              total +
              file.byteLength,
            0,
          ),
      });
    }

    case 'archive': {
      const files =
        normalizeSourceFiles(
          source.files ||
            [],
        );

      return Object.freeze({
        type: 'archive',

        files,

        totalFiles:
          files.length,

        totalBytes:
          files.reduce(
            (
              total,
              file,
            ) =>
              total +
              file.byteLength,
            0,
          ),
      });
    }

    case 'github': {
      /*
       * GitHub source retrieval is intentionally performed
       * by the GitHub service before normalization.
       *
       * The normalizer must not independently retrieve
       * GitHub data because it does not own OAuth state or
       * GitHub connection credentials.
       */
      const githubRepository =
        context.githubRepository;

      if (
        !githubRepository ||
        typeof githubRepository !==
          'object'
      ) {
        throw new AppError({
          code:
            'GITHUB_SOURCE_REQUIRED',

          message:
            'An authorized GitHub repository source is required.',

          statusCode: 400,
        });
      }

      return normalizeRepositoryFiles(
        githubRepository,
      );
    }

    default:
      throw new AppError({
        code:
          'UNSUPPORTED_SOURCE_TYPE',

        message:
          `Unsupported source type: ${source.type}.`,

        statusCode: 400,
      });
  }
};

const normalizeSourceInput =
  async (
    source,
    context = {},
  ) => {
    return normalizeSource(
      source,
      context,
    );
  };

export {
  createSourceHash,
  normalizeFile,
  normalizeSourceFiles,
  normalizePastedSource,
  normalizeRepositoryFiles,
  normalizeSource,
  normalizeSourceInput,
};

export default normalizeSource;