import crypto from 'node:crypto';

import githubConfig from '../../config/github.config.js';

const githubOAuthScopes = [
  'repo',
];

const createOAuthState = () => {
  return crypto.randomBytes(32).toString('hex');
};

const isGithubConfigured = () => {
  return Boolean(
    githubConfig.clientId &&
    githubConfig.clientSecret &&
    githubConfig.redirectUri,
  );
};

const isGithubApiConfigured = () => {
  return Boolean(
    githubConfig.apiBaseUrl,
  );
};

const getGithubAuthorizationHeaders = (
  accessToken = null,
) => {
  if (
    typeof accessToken !== 'string' ||
    !accessToken.trim()
  ) {
    return {};
  }

  return {
    Authorization:
      `Bearer ${accessToken.trim()}`,
  };
};

const createGithubAuthorizationUrl = (
  state,
) => {
  if (!isGithubConfigured()) {
    const error = new Error(
      'GitHub OAuth is not configured.',
    );

    error.code =
      'GITHUB_OAUTH_NOT_CONFIGURED';

    error.statusCode = 503;

    throw error;
  }

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

  const authorizationUrl =
    new URL(
      '/login/oauth/authorize',
      githubConfig.oauthBaseUrl,
    );

  authorizationUrl.searchParams.set(
    'client_id',
    githubConfig.clientId,
  );

  authorizationUrl.searchParams.set(
    'redirect_uri',
    githubConfig.redirectUri,
  );

  authorizationUrl.searchParams.set(
    'scope',
    githubOAuthScopes.join(' '),
  );

  authorizationUrl.searchParams.set(
    'state',
    state,
  );

  return authorizationUrl.toString();
};

const exchangeGithubCode = async (
  code,
) => {
  if (!isGithubConfigured()) {
    const error = new Error(
      'GitHub OAuth is not configured.',
    );

    error.code =
      'GITHUB_OAUTH_NOT_CONFIGURED';

    error.statusCode = 503;

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

  const response =
    await fetch(
      `${githubConfig.oauthBaseUrl}/login/oauth/access_token`,
      {
        method: 'POST',

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',

          'User-Agent':
            'ReviewX-Code-Review-Platform',
        },

        body: JSON.stringify({
          client_id:
            githubConfig.clientId,

          client_secret:
            githubConfig.clientSecret,

          code:
            code.trim(),

          redirect_uri:
            githubConfig.redirectUri,
        }),

        signal:
          AbortSignal.timeout(
            githubConfig.timeoutMs,
          ),
      },
    );

  let payload;

  try {
    payload =
      await response.json();
  } catch {
    payload = null;
  }

  if (
    !response.ok ||
    !payload ||
    payload.error
  ) {
    const error = new Error(
      payload?.error_description ||
        'GitHub authorization failed.',
    );

    error.code =
      'GITHUB_OAUTH_EXCHANGE_FAILED';

    error.statusCode = 502;

    throw error;
  }

  if (
    typeof payload.access_token !==
      'string' ||
    !payload.access_token
  ) {
    const error = new Error(
      'GitHub did not return an access token.',
    );

    error.code =
      'GITHUB_ACCESS_TOKEN_MISSING';

    error.statusCode = 502;

    throw error;
  }

  return Object.freeze({
    accessToken:
      payload.access_token,

    tokenType:
      payload.token_type ||
      'bearer',

    scope:
      payload.scope ||
      '',
  });
};

const createGithubWebhookSignature = (
  payload,
) => {
  if (
    !githubConfig.webhookSecret
  ) {
    const error = new Error(
      'GitHub webhook secret is not configured.',
    );

    error.code =
      'GITHUB_WEBHOOK_SECRET_NOT_CONFIGURED';

    error.statusCode = 503;

    throw error;
  }

  const rawBody =
    Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(
          String(payload),
          'utf8',
        );

  return `sha256=${crypto
    .createHmac(
      'sha256',
      githubConfig.webhookSecret,
    )
    .update(rawBody)
    .digest('hex')}`;
};

const verifyGithubWebhookSignature = (
  payload,
  signature,
) => {
  if (
    typeof signature !== 'string' ||
    !signature.startsWith(
      'sha256=',
    )
  ) {
    return false;
  }

  let expectedSignature;

  try {
    expectedSignature =
      createGithubWebhookSignature(
        payload,
      );
  } catch {
    return false;
  }

  const expected =
    Buffer.from(
      expectedSignature,
      'utf8',
    );

  const received =
    Buffer.from(
      signature,
      'utf8',
    );

  if (
    expected.length !==
    received.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    received,
  );
};

export {
  githubOAuthScopes,
  createOAuthState,
  isGithubConfigured,
  isGithubApiConfigured,
  getGithubAuthorizationHeaders,
  createGithubAuthorizationUrl,
  exchangeGithubCode,
  createGithubWebhookSignature,
  verifyGithubWebhookSignature,
};