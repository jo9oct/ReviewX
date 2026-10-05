import {
  createConnection,
  completeConnection,
  getGithubUser,
  getRepositories,
  getBranches,
  getRepository,
} from '../services/github.service.js';

const connectGithub = (
  req,
  res,
  next,
) => {
  try {
    const {
      authorizationUrl,
    } =
      createConnection();

    return res.redirect(
      authorizationUrl,
    );
  } catch (error) {
    return next(error);
  }
};

const githubCallback = async (
  req,
  res,
  next,
) => {
  try {
    const {
      code,
      state,
      error,
      error_description:
        errorDescription,
    } = req.query;

    if (error) {
      const callbackError =
        new Error(
          errorDescription ||
            'GitHub authorization was cancelled or denied.',
        );

      callbackError.code =
        'GITHUB_AUTHORIZATION_DENIED';

      callbackError.statusCode = 400;

      throw callbackError;
    }

    const connection =
      await completeConnection({
        code,
        state,
      });

    return res.status(200).json({
      success: true,

      data: {
        connected:
          true,

        provider:
          'github',

        connectionId:
          connection.connectionId,

        scope:
          connection.scope,

        githubUser:
          connection.githubUser,
      },

      meta: {
        requestId:
          req.requestId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getGithubConnectionUser =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const githubUser =
        await getGithubUser({
          connectionId:
            req.params.connectionId,
        });

      return res.status(200).json({
        success: true,

        data: {
          githubUser,
        },

        meta: {
          requestId:
            req.requestId,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

const getGithubRepositories =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const repositories =
        await getRepositories({
          connectionId:
            req.params.connectionId,

          page:
            req.query.page,

          perPage:
            req.query.perPage,
        });

      return res.status(200).json({
        success: true,

        data: {
          repositories,
        },

        meta: {
          requestId:
            req.requestId,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

const getGithubBranches =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const branches =
        await getBranches({
          connectionId:
            req.params.connectionId,

          owner:
            req.params.owner,

          name:
            req.params.name,

          page:
            req.query.page,

          perPage:
            req.query.perPage,
        });

      return res.status(200).json({
        success: true,

        data: {
          branches,
        },

        meta: {
          requestId:
            req.requestId,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

const getGithubRepository =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const repository =
        await getRepository({
          connectionId:
            req.params.connectionId,

          owner:
            req.params.owner,

          name:
            req.params.name,

          ref:
            req.query.ref,
        });

      return res.status(200).json({
        success: true,

        data: {
          repository,
        },

        meta: {
          requestId:
            req.requestId,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

export {
  connectGithub,
  githubCallback,
  getGithubConnectionUser,
  getGithubRepositories,
  getGithubBranches,
  getGithubRepository,
};