// STATUS: UPDATED

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
    } = createConnection({
      userId: req.user.id,
    });

    if (
      req.headers.accept?.includes('application/json') ||
      req.query.format === 'json' ||
      req.xhr
    ) {
      return res.status(200).json({
        success: true,
        data: {
          authorizationUrl,
        },
        meta: {
          requestId: req.requestId,
        },
      });
    }

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

    let connection;
    try {
      connection =
        await completeConnection({
          code,
          state,
        });
    } catch (connectionError) {
      // If code was already exchanged (e.g. user refreshed the callback tab, hit back, or duplicate request)
      // Check if we have an active connection in DB for this user/state
      try {
        const { GithubConnection } = await import(
          '../database/models/githubConnection.model.js'
        );
        let userIdFromState;
        try {
          const jwt = (await import('jsonwebtoken')).default;
          const { config } = await import('../config/env.js');
          const decoded = jwt.verify(state, config.jwtSecret);
          userIdFromState = decoded?.userId;
        } catch {}

        if (userIdFromState) {
          const existing = await GithubConnection.findOne({
            userId: userIdFromState,
          })
            .sort({ createdAt: -1 })
            .lean();

          if (existing) {
            connection = {
              connectionId: existing.connectionId,
              userId: existing.userId,
              scope: existing.scope,
              githubUser: existing.githubUser,
            };
          }
        }
      } catch {}

      if (!connection) {
        throw connectionError;
      }
    }

    if (
      req.headers.accept?.includes('application/json') &&
      !req.headers.accept?.includes('text/html')
    ) {
      return res.status(200).json({
        success: true,
        data: {
          connected: true,
          provider: 'github',
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
    }

    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl =
      `${frontendUrl.replace(/\/$/, '')}/dashboard?tab=new-review&source=github&connectionId=${encodeURIComponent(connection.connectionId)}`;

    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https:;"
    );

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GitHub Connected — ReviewX</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #090d16;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 16px;
          }
          .card {
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 12px;
            padding: 32px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .icon {
            font-size: 32px;
            margin-bottom: 12px;
          }
          h2 { margin: 0 0 8px 0; font-size: 18px; color: #f8fafc; font-weight: 600; }
          p { margin: 0 0 16px 0; font-size: 13px; color: #94a3b8; }
          .btn {
            display: inline-block;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 500;
            background: #2563eb;
            color: #ffffff;
            border-radius: 6px;
            text-decoration: none;
            border: none;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>GitHub Connected!</h2>
          <p>Redirecting back to ReviewX...</p>
          <button class="btn" onclick="done()">Return to Dashboard</button>
        </div>
        <script>
          const payload = {
            type: 'REVIEWX_GITHUB_CONNECTED',
            connectionId: ${JSON.stringify(connection.connectionId)},
            githubUser: ${JSON.stringify(connection.githubUser)}
          };
          function done() {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(payload, '*');
              setTimeout(() => window.close(), 200);
            } else {
              window.location.href = ${JSON.stringify(redirectUrl)};
            }
          }
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, '*');
            setTimeout(() => window.close(), 600);
          } else {
            setTimeout(() => { window.location.href = ${JSON.stringify(redirectUrl)}; }, 800);
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    if (
      req.headers.accept?.includes('application/json') &&
      !req.headers.accept?.includes('text/html')
    ) {
      return next(error);
    }

    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl =
      `${frontendUrl.replace(/\/$/, '')}/dashboard?tab=new-review`;

    let friendlyMessage = error.message || 'Unable to connect to GitHub.';
    if (error.code === 'INVALID_GITHUB_OAUTH_STATE') {
      friendlyMessage = 'This GitHub authorization session has expired or was already completed. Return to ReviewX to connect.';
    } else if (error.code === 'GITHUB_AUTHORIZATION_DENIED') {
      friendlyMessage = 'GitHub authorization was cancelled or denied.';
    } else if (error.code === 'GITHUB_OAUTH_EXCHANGE_FAILED') {
      friendlyMessage = 'The GitHub authorization code was already used or has expired. Please try connecting again.';
    }

    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https:;"
    );

    return res.status(error.statusCode || 400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GitHub Connection Incomplete — ReviewX</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #090d16;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 16px;
          }
          .card {
            background: #111827;
            border: 1px solid #374151;
            border-radius: 12px;
            padding: 32px 24px;
            text-align: center;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .icon { font-size: 32px; margin-bottom: 12px; }
          h2 { margin: 0 0 8px 0; font-size: 18px; color: #f8fafc; font-weight: 600; }
          p { margin: 0 0 20px 0; font-size: 13px; color: #94a3b8; line-height: 1.5; }
          .actions { display: flex; gap: 10px; justify-content: center; }
          button {
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            border: none;
            transition: opacity 0.2s;
          }
          .btn-primary { background: #3b82f6; color: #fff; }
          .btn-secondary { background: #374151; color: #f1f5f9; }
          button:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⚠️</div>
          <h2>GitHub Connection Incomplete</h2>
          <p>${friendlyMessage}</p>
          <div class="actions">
            <button class="btn-primary" onclick="retry()">Return to ReviewX</button>
            <button class="btn-secondary" onclick="window.close()">Close</button>
          </div>
        </div>
        <script>
          const errorPayload = {
            type: 'REVIEWX_GITHUB_ERROR',
            code: ${JSON.stringify(error.code || 'UNKNOWN_ERROR')},
            message: ${JSON.stringify(friendlyMessage)}
          };
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(errorPayload, '*');
          }
          function retry() {
            if (window.opener && !window.opener.closed) {
              window.close();
            } else {
              window.location.href = ${JSON.stringify(redirectUrl)};
            }
          }
        </script>
      </body>
      </html>
    `);
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
          userId:
            req.user.id,
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
          userId:
            req.user.id,
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
          userId:
            req.user.id,
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
          userId:
            req.user.id,
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

const getGithubStatus = async (
  req,
  res,
  next,
) => {
  try {
    const { GithubConnection } = await import(
      '../database/models/githubConnection.model.js'
    );
    const existing = await GithubConnection.findOne({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existing) {
      return res.status(200).json({
        success: true,
        data: {
          connected: true,
          connectionId: existing.connectionId,
          githubUser: existing.githubUser,
        },
        meta: {
          requestId: req.requestId,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        connected: false,
      },
      meta: {
        requestId: req.requestId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const disconnectGithub = async (
  req,
  res,
  next,
) => {
  try {
    const { GithubConnection } = await import(
      '../database/models/githubConnection.model.js'
    );
    await GithubConnection.deleteMany({
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data: {
        disconnected: true,
      },
      meta: {
        requestId: req.requestId,
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
  getGithubStatus,
  disconnectGithub,
};