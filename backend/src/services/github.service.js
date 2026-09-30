import {
  createGithubOAuthSession,
  completeGithubOAuth,
  consumeGithubConnection,
} from '../integrations/github/github.oauth.js';

import {
  getAuthenticatedGithubUser,
  listGithubRepositories,
  listGithubBranches,
  getRepositorySource,
} from '../integrations/github/github.repository.js';

import {
  isGithubConfigured,
} from '../integrations/github/github.auth.js';

const assertGithubEnabled = () => {
  if (!isGithubConfigured()) {
    const error = new Error(
      'GitHub integration is not configured.',
    );

    error.code =
      'GITHUB_NOT_CONFIGURED';

    error.statusCode = 503;

    throw error;
  }
};

const createConnection = () => {
  assertGithubEnabled();

  return createGithubOAuthSession();
};

const completeConnection = async ({
  state,
  code,
}) => {
  assertGithubEnabled();

  if (
    typeof state !== 'string' ||
    !state.trim()
  ) {
    const error = new Error(
      'GitHub OAuth state is required.',
    );

    error.code =
      'GITHUB_OAUTH_STATE_REQUIRED';

    error.statusCode = 400;

    throw error;
  }

  if (
    typeof code !== 'string' ||
    !code.trim()
  ) {
    const error = new Error(
      'GitHub authorization code is required.',
    );

    error.code =
      'GITHUB_AUTHORIZATION_CODE_REQUIRED';

    error.statusCode = 400;

    throw error;
  }

  const connection =
    await completeGithubOAuth({
      state,
      code,
    });

  return {
    connectionId:
      connection.connectionId,

    scope:
      connection.scope,

    githubUser:
      connection.githubUser,
  };
};

const getConnection = (
  connectionId,
) => {
  if (
    typeof connectionId !== 'string' ||
    !connectionId.trim()
  ) {
    const error = new Error(
      'GitHub connection ID is required.',
    );

    error.code =
      'GITHUB_CONNECTION_ID_REQUIRED';

    error.statusCode = 400;

    throw error;
  }

  return consumeGithubConnection(
    connectionId,
  );
};

const getGithubUser = async ({
  connectionId,
}) => {
  const connection =
    getConnection(
      connectionId,
    );

  const githubUser =
    await getAuthenticatedGithubUser({
      accessToken:
        connection.accessToken,
    });

  return {
    id:
      githubUser.id,

    login:
      githubUser.login,

    name:
      githubUser.name || null,

    avatarUrl:
      githubUser.avatar_url || null,

    htmlUrl:
      githubUser.html_url || null,
  };
};

const getRepositories = async ({
  connectionId,
  page = 1,
  perPage = 30,
}) => {
  const connection =
    getConnection(
      connectionId,
    );

  const repositories =
    await listGithubRepositories({
      accessToken:
        connection.accessToken,

      page,

      perPage,
    });

  return repositories.map(
    (repository) => ({
      id:
        repository.id,

      owner:
        repository.owner?.login ||
        repository.owner?.name ||
        null,

      name:
        repository.name,

      fullName:
        repository.full_name,

      private:
        Boolean(
          repository.private,
        ),

      defaultBranch:
        repository.default_branch ||
        null,

      htmlUrl:
        repository.html_url ||
        null,

      description:
        repository.description ||
        null,
    }),
  );
};

const getBranches = async ({
  connectionId,
  owner,
  name,
  page = 1,
  perPage = 100,
}) => {
  const connection =
    getConnection(
      connectionId,
    );

  const branches =
    await listGithubBranches({
      owner,
      name,

      accessToken:
        connection.accessToken,

      page,

      perPage,
    });

  return branches.map(
    (branch) => ({
      name:
        branch.name,

      protected:
        Boolean(
          branch.protected,
        ),

      commitSha:
        branch.commit?.sha ||
        null,
    }),
  );
};

const getRepository = async ({
  connectionId,
  owner,
  name,
  ref,
}) => {
  const connection =
    getConnection(
      connectionId,
    );

  return getRepositorySource({
    owner,
    name,
    ref,

    accessToken:
      connection.accessToken,
  });
};

export {
  createConnection,
  completeConnection,
  getGithubUser,
  getRepositories,
  getBranches,
  getRepository,
};