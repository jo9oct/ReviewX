import {
  projectRepository,
} from '../database/repositories/project.repository.js';

import {
  AppError,
} from '../utils/errors.js';

/*
 * Temporary owner used until the real
 * authentication/user system is connected.
 */
const DEFAULT_OWNER_ID =
  'user-test-001';

const normalizePagination = (
  options = {},
) => {
  const requestedLimit =
    Number(
      options.limit ?? 50,
    );

  const requestedSkip =
    Number(
      options.skip ?? 0,
    );

  if (
    !Number.isInteger(
      requestedLimit,
    ) ||
    requestedLimit < 1 ||
    requestedLimit > 100
  ) {
    throw new AppError({
      code:
        'INVALID_PROJECT_LIMIT',

      message:
        'Project limit must be an integer between 1 and 100.',

      statusCode: 400,
    });
  }

  if (
    !Number.isInteger(
      requestedSkip,
    ) ||
    requestedSkip < 0
  ) {
    throw new AppError({
      code:
        'INVALID_PROJECT_SKIP',

      message:
        'Project skip must be a non-negative integer.',

      statusCode: 400,
    });
  }

  return {
    limit:
      requestedLimit,

    skip:
      requestedSkip,
  };
};

const getProjectsResponse =
  async (
    options = {},
  ) => {
    const {
      limit,
      skip,
    } =
      normalizePagination(
        options,
      );

    const projects =
      await projectRepository.findMany(
        {
          ownerId:
            DEFAULT_OWNER_ID,
        },
        {
          limit,
          skip,
        },
      );

    return {
      projects:
        projects.map(
          (project) => ({
            id:
              project._id?.toString?.() ||
              project._id,

            ownerId:
              project.ownerId,

            name:
              project.name,

            normalizedName:
              project.normalizedName,

            sourceType:
              project.sourceType,

            repository:
              project.repository ||
              null,

            metadata:
              project.metadata ||
              {},

            createdAt:
              project.createdAt ||
              null,

            updatedAt:
              project.updatedAt ||
              null,
          }),
        ),

      limit,

      skip,
    };
  };

export {
  getProjectsResponse,
};