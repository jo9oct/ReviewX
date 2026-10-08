// STATUS: UPDATED

import crypto from 'node:crypto';

import {
  createGithubAuthorizationUrl,
  createOAuthState,
  exchangeGithubCode,
  isGithubConfigured,
} from './github.auth.js';

import {
  githubRequest,
} from './github.client.js';

const OAUTH_STATE_MAX_AGE_MS =
  10 * 60 * 1000;

const CONNECTION_MAX_AGE_MS =
  60 * 60 * 1000;

const oauthStates =
  new Map();

const githubConnections =
  new Map();

const cleanupExpiredStates = () => {
  const now =
    Date.now();

  for (
    const [
      state,
      record,
    ] of oauthStates
  ) {
    if (
      now -
        record.createdAt >
      OAUTH_STATE_MAX_AGE_MS
    ) {
      oauthStates.delete(
        state,
      );
    }
  }
};

const cleanupExpiredConnections =
  () => {
    const now =
      Date.now();

    for (
      const [
        connectionId,
        connection,
      ] of githubConnections
    ) {
      if (
        now -
          connection.createdAt >
        CONNECTION_MAX_AGE_MS
      ) {
        githubConnections.delete(
          connectionId,
        );
      }
    }
  };

const createGithubOAuthSession = ({
  userId,
} = {}) => {
  cleanupExpiredStates();

  if (
    !isGithubConfigured()
  ) {
    const error = new Error(
      'GitHub OAuth is not configured.',
    );

    error.code =
      'GITHUB_OAUTH_NOT_CONFIGURED';

    error.statusCode = 503;

    throw error;
  }

  if (
    typeof userId !== 'string' ||
    !userId.trim()
  ) {
    const error = new Error(
      'Authenticated user ID is required to connect GitHub.',
    );

    error.code =
      'GITHUB_USER_ID_REQUIRED';

    error.statusCode = 401;

    throw error;
  }

  const state =
    createOAuthState();

  const authorizationUrl =
    createGithubAuthorizationUrl(
      state,
    );

  oauthStates.set(
    state,
    {
      createdAt:
        Date.now(),

      userId:
        userId.trim(),
    },
  );

  return {
    state,
    authorizationUrl,
  };
};

const consumeGithubOAuthState =
  (state) => {
    cleanupExpiredStates();

    const record =
      oauthStates.get(
        state,
      );

    if (!record) {
      const error = new Error(
        'The GitHub OAuth state is invalid or expired.',
      );

      error.code =
        'INVALID_GITHUB_OAUTH_STATE';

      error.statusCode = 400;

      throw error;
    }

    oauthStates.delete(
      state,
    );

    return Object.freeze({
      ...record,
    });
  };

const completeGithubOAuth =
  async ({
    state,
    code,
  }) => {
    const oauthState =
      consumeGithubOAuthState(
        state,
      );

    const token =
      await exchangeGithubCode(
        code,
      );

    const githubUser =
      await githubRequest({
        path:
          '/user',

        accessToken:
          token.accessToken,
      });

    if (
      !githubUser ||
      typeof githubUser.id !==
        'number' ||
      typeof githubUser.login !==
        'string'
    ) {
      const error = new Error(
        'GitHub returned an invalid authenticated user.',
      );

      error.code =
        'INVALID_GITHUB_USER';

      error.statusCode = 502;

      throw error;
    }

    const connectionId =
      crypto.randomUUID();

    cleanupExpiredConnections();

    const connection = {
      createdAt:
        Date.now(),

      userId:
        oauthState.userId,

      accessToken:
        token.accessToken,

      tokenType:
        token.tokenType,

      scope:
        token.scope,

      githubUser: {
        id:
          githubUser.id,

        login:
          githubUser.login,

        name:
          githubUser.name ||
          null,

        avatarUrl:
          githubUser.avatar_url ||
          null,

        htmlUrl:
          githubUser.html_url ||
          null,
      },
    };

    githubConnections.set(
      connectionId,
      connection,
    );

    return Object.freeze({
      connectionId,

      userId:
        connection.userId,

      scope:
        connection.scope,

      githubUser:
        connection.githubUser,
    });
  };

const consumeGithubConnection =
  (
    connectionId,
  ) => {
    cleanupExpiredConnections();

    const connection =
      githubConnections.get(
        connectionId,
      );

    if (!connection) {
      const error = new Error(
        'The GitHub connection is invalid or expired.',
      );

      error.code =
        'INVALID_GITHUB_CONNECTION';

      error.statusCode = 401;

      throw error;
    }

    return Object.freeze({
      ...connection,
    });
  };

export {
  createGithubOAuthSession,
  completeGithubOAuth,
  consumeGithubOAuthState,
  consumeGithubConnection,
};