// STATUS: UPDATED

import {
  getProjectsResponse,
} from '../services/project.service.js';

import {
  createResponse,
} from '../utils/response.js';

const getProjects = async (
  req,
  res,
  next,
) => {
  try {
    const result =
      await getProjectsResponse({
        ownerId:
          req.user.id,

        limit:
          req.query.limit,

        skip:
          req.query.skip,
      });

    return res
      .status(200)
      .json(
        createResponse({
          success: true,

          data:
            result.projects,

          meta: {
            requestId:
              req.requestId,

            count:
              result.projects.length,

            limit:
              result.limit,

            skip:
              result.skip,
          },
        }),
      );
  } catch (error) {
    return next(error);
  }
};

export {
  getProjects,
};