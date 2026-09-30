import {
  Worker,
} from 'bullmq';

import queueConfig from './src/config/queue.config.js';

import {
  QUEUE_NAMES,
} from './src/queue/queue.constants.js';

import {
  getRedisConnection,
  connectRedis,
  disconnectRedis,
} from './src/queue/redis.client.js';

import {
  createReviewProcessor,
} from './src/jobs/review.job.js';

import {
  createReportProcessor,
} from './src/jobs/report.job.js';

import {
  createCleanupProcessor,
} from './src/jobs/cleanup.job.js';

import {
  createNotificationProcessor,
} from './src/jobs/notification.job.js';

const workers = [];

const createWorker = ({
  queueName,
  processor,
}) => {
  const worker =
    new Worker(
      queueName,
      processor,
      {
        connection:
          getRedisConnection(),

        concurrency:
          queueConfig.concurrency,
      },
    );

  worker.on(
    'completed',
    (job) => {
      console.info(
        `[worker] completed ${queueName}:${job.id}`,
      );
    },
  );

  worker.on(
    'failed',
    (
      job,
      error,
    ) => {
      console.error(
        `[worker] failed ${queueName}:${job?.id || 'unknown'}`,
        error,
      );
    },
  );

  worker.on(
    'error',
    (error) => {
      console.error(
        `[worker] error ${queueName}`,
        error,
      );
    },
  );

  workers.push(
    worker,
  );

  return worker;
};

const createWorkerServices =
  () => {
    /*
     * Resolve application services
     * from the worker composition root.
     *
     * Queue processors receive services
     * and must not contain business logic.
     */

    const services = {
      reviewService:
        null,

      reportService:
        null,

      cleanupService:
        null,

      notificationService:
        null,
    };

    if (
      !services.reviewService
    ) {
      throw new Error(
        'Worker reviewService is not configured.',
      );
    }

    if (
      !services.reportService
    ) {
      throw new Error(
        'Worker reportService is not configured.',
      );
    }

    if (
      !services.cleanupService
    ) {
      throw new Error(
        'Worker cleanupService is not configured.',
      );
    }

    if (
      !services.notificationService
    ) {
      throw new Error(
        'Worker notificationService is not configured.',
      );
    }

    return services;
  };

const bootstrap =
  async () => {
    await connectRedis();

    const services =
      createWorkerServices();

    createWorker({
      queueName:
        QUEUE_NAMES.REVIEW,

      processor:
        createReviewProcessor({
          reviewService:
            services.reviewService,
        }),
    });

    createWorker({
      queueName:
        QUEUE_NAMES.REPORT,

      processor:
        createReportProcessor({
          reportService:
            services.reportService,
        }),
    });

    createWorker({
      queueName:
        QUEUE_NAMES.CLEANUP,

      processor:
        createCleanupProcessor({
          cleanupService:
            services.cleanupService,
        }),
    });

    createWorker({
      queueName:
        QUEUE_NAMES.NOTIFICATION,

      processor:
        createNotificationProcessor({
          notificationService:
            services.notificationService,
        }),
    });

    console.info(
      '[worker] queue workers started',
    );
  };

let shuttingDown =
  false;

const shutdown =
  async (
    signal,
  ) => {
    if (
      shuttingDown
    ) {
      return;
    }

    shuttingDown =
      true;

    console.info(
      `[worker] received ${signal}`,
    );

    try {
      await Promise.all(
        workers.map(
          (worker) =>
            worker.close(),
        ),
      );

      await disconnectRedis();

      console.info(
        '[worker] shutdown completed',
      );

      process.exit(
        0,
      );
    } catch (
      error
    ) {
      console.error(
        '[worker] shutdown failed',
        error,
      );

      process.exit(
        1,
      );
    }
  };

process.on(
  'SIGTERM',
  () =>
    shutdown(
      'SIGTERM',
    ),
);

process.on(
  'SIGINT',
  () =>
    shutdown(
      'SIGINT',
    ),
);

process.on(
  'uncaughtException',
  (error) => {
    console.error(
      '[worker] uncaught exception',
      error,
    );

    shutdown(
      'UNCAUGHT_EXCEPTION',
    );
  },
);

process.on(
  'unhandledRejection',
  (error) => {
    console.error(
      '[worker] unhandled rejection',
      error,
    );

    shutdown(
      'UNHANDLED_REJECTION',
    );
  },
);

bootstrap().catch(
  (error) => {
    console.error(
      '[worker] startup failed',
      error,
    );

    process.exit(
      1,
    );
  },
);