// STATUS: UPDATED

import {
  projectRepository,
} from '../database/repositories/project.repository.js';

import {
  AppError,
} from '../utils/errors.js';

const normalizeOwnerId = (
  ownerId,
) => {
  if (
    !ownerId ||
    typeof ownerId !== 'string' ||
    !ownerId.trim()
  ) {
    throw new AppError({
      code:
        'AUTHENTICATED_OWNER_REQUIRED',

      message:
        'An authenticated user is required.',

      statusCode: 401,
    });
  }

  return ownerId.trim();
};

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
      ownerId,
      ...paginationOptions
    } = options;

    const normalizedOwnerId =
      normalizeOwnerId(
        ownerId,
      );

    const {
      limit,
      skip,
    } =
      normalizePagination(
        paginationOptions,
      );

    const projects =
      await projectRepository.findMany(
        {
          ownerId:
            normalizedOwnerId,
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