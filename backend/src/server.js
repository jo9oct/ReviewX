// STATUS: UPDATED

import 'dotenv/config';

import http from 'node:http';
import { fileURLToPath } from 'node:url';

import express from 'express';

import cors from 'cors';

import environment from './config/environment.js';

import {
  connectDatabase,
  disconnectDatabase,
} from './database/connection.js';

import authRoutes from './routes/auth.routes.js';

import reviewRoutes from './routes/review.routes.js';

import reportRoutes from './routes/report.routes.js';

import githubRoutes from './routes/github.routes.js';

import scheduledReviewRoutes from './routes/scheduledReview.routes.js';

import projectRoutes from './routes/project.routes.js';

import subscriptionRoutes from './routes/subscription.routes.js';

import paymentRoutes from './routes/payment.routes.js';

import companyRulesRoutes from './routes/companyRules.routes.js';

import companyRoutes from './routes/company.routes.js';

import invitationRoutes from './routes/invitation.routes.js';

import adminRoutes from './routes/admin.routes.js';

import notificationRoutes from './routes/notification.routes.js';

import {
  notFoundMiddleware,
} from './middleware/notFound.middleware.js';

import {
  errorMiddleware,
} from './middleware/error.middleware.js';

import {
  securityMiddleware,
} from './middleware/security.middleware.js';

import {
  createResponse,
} from './utils/response.js';

import {
  getSSEManager,
} from './utils/sseManager.js';

import {
  subscribeToNotificationEvents,
  closeNotificationEventBus,
} from './utils/notificationEventBus.js';

const app = express();

const {
  app: appConfig,
  http: httpConfig,
} = environment;

app.disable(
  'x-powered-by',
);

app.use(
  securityMiddleware,
);

const configuredOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
const corsWhitelist = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsWhitelist.includes(origin) || corsWhitelist.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

app.use(
  express.json({
    limit:
      httpConfig.bodyLimit,
  }),
);

app.use(
  express.urlencoded({
    extended: false,
    limit:
      httpConfig.bodyLimit,
    parameterLimit:
      httpConfig.parameterLimit,
  }),
);

app.get(
  '/health',
  (req, res) => {
    return res.status(200).json(
      createResponse({
        success: true,
        data: {
          status: 'ok',
          service:
            appConfig.name,
          version:
            appConfig.version,
        },
        meta: {
          requestId:
            req.requestId,
        },
      }),
    );
  },
);

/*
 * Authentication routes
 *
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * GET  /api/v1/auth/me
 */
app.use(
  '/api/v1/auth',
  authRoutes,
);

app.use(
  '/api/v1/reviews',
  reviewRoutes,
);

app.use(
  '/api/v1',
  reportRoutes,
);

app.use(
  '/api/v1/github',
  githubRoutes,
);

app.use(
  '/api/v1/scheduled-reviews',
  scheduledReviewRoutes,
);

app.use(
  '/api/v1/projects',
  projectRoutes,
);

app.use(
  '/api/v1/subscriptions',
  subscriptionRoutes,
);

app.use(
  '/api/v1/payment',
  paymentRoutes,
);

app.use(
  '/api/v1/company-rules',
  companyRulesRoutes,
);

app.use(
  '/api/v1/company',
  companyRoutes,
);

app.use(
  '/api/v1/invitations',
  invitationRoutes,
);

app.use(
  '/api/v1/admin',
  adminRoutes,
);

app.use(
  '/api/admin',
  adminRoutes,
);

app.use(
  '/api/v1/notifications',
  notificationRoutes,
);

app.use(
  notFoundMiddleware,
);

app.use(
  errorMiddleware,
);

const server =
  http.createServer(app);

server.requestTimeout =
  httpConfig.requestTimeout;

server.keepAliveTimeout =
  httpConfig.keepAliveTimeout;

server.headersTimeout =
  httpConfig.headersTimeout;

let shuttingDown = false;

const shutdown = async (
  signal,
) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  process.stdout.write(
    `Received ${signal}. Shutting down HTTP server...\n`,
  );

  server.close(
    async (serverError) => {
      if (serverError) {
        process.stderr.write(
          `HTTP server shutdown failed: ${serverError.message}\n`,
        );

        process.exitCode = 1;

        return;
      }

      try {
        await closeNotificationEventBus();

        await disconnectDatabase();

        process.stdout.write(
          'MongoDB connection closed.\n',
        );

        process.stdout.write(
          'HTTP server stopped.\n',
        );

        process.exitCode = 0;
      } catch (error) {
        process.stderr.write(
          `Database shutdown failed: ${
            error instanceof Error
              ? error.message
              : String(error)
          }\n`,
        );

        process.exitCode = 1;
      }
    },
  );
};

process.once(
  'SIGINT',
  () => shutdown('SIGINT'),
);

process.once(
  'SIGTERM',
  () => shutdown('SIGTERM'),
);

process.once(
  'uncaughtException',
  (error) => {
    process.stderr.write(
      `Uncaught exception: ${
        error.stack ||
        error.message
      }\n`,
    );

    shutdown(
      'uncaughtException',
    );
  },
);

process.once(
  'unhandledRejection',
  (reason) => {
    const message =
      reason instanceof Error
        ? reason.stack ||
          reason.message
        : String(reason);

    process.stderr.write(
      `Unhandled rejection: ${message}\n`,
    );

    shutdown(
      'unhandledRejection',
    );
  },
);

server.on(
  'error',
  (error) => {
    process.stderr.write(
      `HTTP server error: ${error.message}\n`,
    );

    process.exitCode = 1;
  },
);

const startServer =
  async () => {
    try {
      await connectDatabase();

      process.stdout.write(
        'MongoDB connected successfully.\n',
      );

      // Bridge notification events published by the worker process to the SSE
      // connections held by this (server) process.
      try {
        await subscribeToNotificationEvents((userId, event) => {
          getSSEManager().sendToUser(userId, event);
        });

        process.stdout.write(
          'Notification event bus subscribed.\n',
        );
      } catch (busError) {
        process.stderr.write(
          `Notification event bus subscribe failed: ${busError.message}\n`,
        );
      }

      server.listen(
        appConfig.port,
        appConfig.host,
        () => {
          process.stdout.write(
            `${appConfig.name} listening on ${appConfig.host}:http://localhost:${appConfig.port}\n`,
          );
        },
      );
    } catch (error) {
      process.stderr.write(
        `Database connection failed: ${
          error instanceof Error
            ? error.stack ||
              error.message
            : String(error)
        }\n`,
      );

      process.exitCode = 1;
    }
  };

// Don't auto-bind the port when running under the test runner — the
// integration tests import `app` and listen on an ephemeral port themselves.
const isMainModule =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === process.argv[1];

const isTestRun =
  process.env.NODE_TEST_CONTEXT !== undefined ||
  process.env.NODE_ENV === 'test' ||
  process.argv.includes('--test') ||
  process.execArgv.includes('--test') ||
  process.argv.some((arg) => arg.includes('.test.') || arg.includes('test'));

if (isMainModule && !isTestRun) {
  startServer();
}

export {
  app,
  server,
};