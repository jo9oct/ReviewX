import githubConfig from '../../config/github.config.js';

import {
  getGithubAuthorizationHeaders,
} from './github.auth.js';

const createTimeoutSignal = (
  timeoutMs,
) => {
  return AbortSignal.timeout(
    timeoutMs,
  );
};

const createHeaders = (
  accessToken = null,
) => {
  return {
    Accept:
      'application/vnd.github+json',

    'X-GitHub-Api-Version':
      githubConfig.apiVersion,

    'User-Agent':
      'ReviewX-Code-Review-Platform',

    ...getGithubAuthorizationHeaders(
      accessToken,
    ),
  };
};

const githubRequest = async ({
  method = 'GET',
  path,
  body,
  accessToken = null,
}) => {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/')
  ) {
    const error = new Error(
      'A valid GitHub API path is required.',
    );

    error.code =
      'INVALID_GITHUB_API_PATH';

    error.statusCode = 500;

    throw error;
  }

  const response =
    await fetch(
      `${githubConfig.apiBaseUrl}${path}`,
      {
        method,

        headers: {
          ...createHeaders(
            accessToken,
          ),

          ...(body !== undefined
            ? {
                'Content-Type':
                  'application/json',
              }
            : {}),
        },

        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,

        signal:
          createTimeoutSignal(
            githubConfig.timeoutMs,
          ),
      },
    );

  let payload = null;

  const contentType =
    response.headers.get(
      'content-type',
    ) || '';

  if (
    contentType.includes(
      'application/json',
    )
  ) {
    try {
      payload =
        await response.json();
    } catch {
      payload = null;
    }
  } else {
    try {
      payload =
        await response.text();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message ||
        `GitHub API request failed with status ${response.status}.`,
    );

    error.code =
      response.status === 401
        ? 'GITHUB_UNAUTHORIZED'
        : response.status === 403
          ? 'GITHUB_FORBIDDEN'
          : response.status === 404
            ? 'GITHUB_NOT_FOUND'
            : response.status === 429
              ? 'GITHUB_RATE_LIMITED'
              : 'GITHUB_API_ERROR';

    error.statusCode =
      response.status;

    error.githubStatus =
      response.status;

    error.githubResponse =
      payload;

    const retryAfter =
      response.headers.get(
        'retry-after',
      );

    if (retryAfter) {
      error.retryAfter =
        retryAfter;
    }

    throw error;
  }

  return payload;
};

export {
  githubRequest,
};

export default githubRequest;