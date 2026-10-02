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
  connectDatabase,
  disconnectDatabase,
} from './src/database/connection.js';

import {
  createReportProcessor,
} from './src/jobs/report.job.js';

import {
  createCleanupProcessor,
} from './src/jobs/cleanup.job.js';

import {
  createScheduler,
} from './src/scheduler/scheduler.js';

import * as reviewService from './src/services/review.service.js';

import * as reportService from './src/services/report.service.js';

import cleanupService from './src/services/cleanup.service.js';

const workers = [];

let scheduler = null;

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
    return {
      reviewService,

      reportService,

      cleanupService,
    };
  };

const createReviewWorkerProcessor =
  ({
    reviewService,
  }) => {
    if (
      !reviewService ||
      typeof reviewService.executeReview !==
        'function'
    ) {
      throw new TypeError(
        'A review service with executeReview is required.',
      );
    }

    return async (
      job,
    ) => {
      const reviewId =
        job?.data?.reviewId;

      if (
        typeof reviewId !== 'string' ||
        !reviewId.trim()
      ) {
        throw new TypeError(
          'Review ID is required.',
        );
      }

      return reviewService.executeReview({
        reviewId:
          reviewId.trim(),

        attemptNumber:
          job.attemptsMade + 1,

        maxAttempts:
          job.opts.attempts || 1,
      });
    };
  };

const bootstrap =
  async () => {
    await connectDatabase();

    console.info(
      '[worker] MongoDB connected',
    );

    await connectRedis();

    console.info(
      '[worker] Redis connected',
    );

    const services =
      createWorkerServices();

    createWorker({
      queueName:
        QUEUE_NAMES.REVIEW,

      processor:
        createReviewWorkerProcessor({
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

    scheduler =
      createScheduler({
        logger: console,
      });

    await scheduler.start();

    console.info(
      '[worker] review worker started',
    );

    console.info(
      '[worker] report worker started',
    );

    console.info(
      '[worker] cleanup worker started',
    );

    console.info(
      '[worker] scheduler started',
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
      if (scheduler) {
        scheduler.shutdown();
      }

      await Promise.all(
        workers.map(
          (worker) =>
            worker.close(),
        ),
      );

      await disconnectRedis();

      await disconnectDatabase();

      console.info(
        '[worker] scheduler stopped',
      );

      console.info(
        '[worker] Redis connection closed',
      );

      console.info(
        '[worker] MongoDB connection closed',
      );

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