const queueConfig = {
  redisUrl:
    process.env.REDIS_URL ||
    'redis://127.0.0.1:6379',

  concurrency: Number(
    process.env.QUEUE_CONCURRENCY || 3,
  ),

  attempts: Number(
    process.env.QUEUE_ATTEMPTS || 3,
  ),

  backoffMs: Number(
    process.env.QUEUE_BACKOFF_MS || 5000,
  ),

  removeOnComplete: Number(
    process.env.QUEUE_REMOVE_ON_COMPLETE || 100,
  ),

  removeOnFail: Number(
    process.env.QUEUE_REMOVE_ON_FAIL || 100,
  ),

  queues: {
    review:
      process.env.REVIEW_QUEUE_NAME ||
      'review',

    report:
      process.env.REPORT_QUEUE_NAME ||
      'report',

    cleanup:
      process.env.CLEANUP_QUEUE_NAME ||
      'cleanup',
  },
};

export default queueConfig;