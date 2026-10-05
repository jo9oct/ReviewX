import 'dotenv/config';
import http from 'node:http';
import express from 'express';

import environment from './config/environment.js';

import {
  connectDatabase,
  disconnectDatabase,
} from './database/connection.js';

import apiRoutes from './routes/index.js';

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

const app = express();

const {
  app: appConfig,
  http: httpConfig,
} = environment;

app.disable('x-powered-by');

app.use(securityMiddleware);

app.use(
  express.json({
    limit: httpConfig.bodyLimit,
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: httpConfig.bodyLimit,
    parameterLimit: httpConfig.parameterLimit,
  })
);

app.get('/health', (req, res) => {
  return res.status(200).json(
    createResponse({
      success: true,
      data: {
        status: 'ok',
        service: appConfig.name,
        version: appConfig.version,
      },
      meta: {
        requestId: req.requestId,
      },
    })
  );
});

// Mount all API routes under both /api and /api/v1
app.use('/api', apiRoutes);
app.use('/api/v1', apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const server = http.createServer(app);

server.requestTimeout = httpConfig.requestTimeout;
server.keepAliveTimeout = httpConfig.keepAliveTimeout;
server.headersTimeout = httpConfig.headersTimeout;

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  process.stdout.write(`Received ${signal}. Shutting down HTTP server...\n`);

  server.close(async (serverError) => {
    if (serverError) {
      process.stderr.write(`HTTP server shutdown failed: ${serverError.message}\n`);
      process.exitCode = 1;
      return;
    }

    try {
      await disconnectDatabase();
      process.stdout.write('MongoDB connection closed.\n');
      process.stdout.write('HTTP server stopped.\n');
      process.exitCode = 0;
    } catch (error) {
      process.stderr.write(
        `Database shutdown failed: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      );
      process.exitCode = 1;
    }
  });
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

process.once('uncaughtException', (error) => {
  process.stderr.write(
    `Uncaught exception: ${error.stack || error.message}\n`
  );
  shutdown('uncaughtException');
});

process.once('unhandledRejection', (reason) => {
  const message =
    reason instanceof Error ? reason.stack || reason.message : String(reason);
  process.stderr.write(`Unhandled rejection: ${message}\n`);
  shutdown('unhandledRejection');
});

server.on('error', (error) => {
  process.stderr.write(`HTTP server error: ${error.message}\n`);
  process.exitCode = 1;
});

const startServer = async () => {
  try {
    await connectDatabase();
    process.stdout.write('MongoDB connected successfully.\n');

    server.listen(appConfig.port, appConfig.host, () => {
      process.stdout.write(
        `${appConfig.name} listening on ${appConfig.host}:http://localhost:${appConfig.port}\n`
      );
    });
  } catch (error) {
    process.stderr.write(
      `Database connection failed: ${
        error instanceof Error ? error.stack || error.message : String(error)
      }\n`
    );
    process.exitCode = 1;
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export {
  app,
  server,
  startServer,
};

export default app;