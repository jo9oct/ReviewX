import {
  AppError,
} from '../../utils/errors.js';

import {
  sanitizeText,
} from '../../security/inputSanitizer.js';

const validateRepositoryReference = ({
  owner,
  name,
  ref = undefined,
}) => {
  const normalizedOwner =
    sanitizeText(
      owner,
    ).trim();

  const normalizedName =
    sanitizeText(
      name,
    ).trim();

  if (
    !normalizedOwner ||
    !normalizedName
  ) {
    throw new AppError({
      code:
        'INVALID_REPOSITORY_REFERENCE',

      message:
        'A repository owner and name are required.',

      statusCode: 400,
    });
  }

  if (
    normalizedOwner.length > 100 ||
    normalizedName.length > 200
  ) {
    throw new AppError({
      code:
        'REPOSITORY_REFERENCE_TOO_LONG',

      message:
        'The repository reference is too long.',

      statusCode: 400,
    });
  }

  const normalizedRef =
    typeof ref === 'string'
      ? sanitizeText(
          ref,
        ).trim()
      : undefined;

  return Object.freeze({
    owner:
      normalizedOwner,

    name:
      normalizedName,

    ref:
      normalizedRef ||
      undefined,
  });
};

const normalizeRepositorySource = (
  source,
) => {
  if (
    !source ||
    typeof source !==
      'object'
  ) {
    throw new AppError({
      code:
        'INVALID_REPOSITORY_SOURCE',

      message:
        'The repository source is invalid.',

      statusCode: 400,
    });
  }

  const repository =
    source.repository ||
    source.metadata ||
    {};

  const repositoryReference =
    validateRepositoryReference({
      owner:
        repository.owner,

      name:
        repository.name,

      ref:
        repository.ref,
    });

  if (
    !Array.isArray(
      source.files,
    )
  ) {
    throw new AppError({
      code:
        'REPOSITORY_FILES_REQUIRED',

      message:
        'Retrieved repository files are required.',

      statusCode: 400,
    });
  }

  return Object.freeze({
    type:
      'github',

    files:
      source.files,

    metadata: {
      owner:
        repositoryReference.owner,

      name:
        repositoryReference.name,

      ref:
        repositoryReference.ref,

      defaultBranch:
        repository.defaultBranch ||
        null,

      private:
        repository.private === true,

      htmlUrl:
        repository.htmlUrl ||
        null,
    },

    totalFiles:
      source.files.length,

    totalBytes:
      source.files.reduce(
        (
          total,
          file,
        ) =>
          total +
          (
            Number.isFinite(
              file?.byteLength,
            )
              ? file.byteLength
              : Buffer.byteLength(
                  file?.content ||
                    '',
                  'utf8',
                )
          ),
        0,
      ),
  });
};

export {
  validateRepositoryReference,
  normalizeRepositorySource,
};