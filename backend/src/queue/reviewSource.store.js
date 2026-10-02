import {
  getRedisConnection,
} from './redis.client.js';

const REVIEW_SOURCE_PREFIX =
  'review:source:';

const REVIEW_SOURCE_TTL_SECONDS =
  Number(
    process.env.REVIEW_SOURCE_TTL_SECONDS ||
      900,
  );

const createReviewSourceKey = (
  reviewId,
) => {
  if (
    typeof reviewId !== 'string' ||
    !reviewId.trim()
  ) {
    throw new TypeError(
      'Review ID is required.',
    );
  }

  return (
    REVIEW_SOURCE_PREFIX +
    reviewId.trim()
  );
};

const assertTtl = () => {
  if (
    !Number.isInteger(
      REVIEW_SOURCE_TTL_SECONDS,
    ) ||
    REVIEW_SOURCE_TTL_SECONDS <= 0
  ) {
    throw new TypeError(
      'REVIEW_SOURCE_TTL_SECONDS must be a positive integer.',
    );
  }
};

const storeReviewSource = async ({
  reviewId,
  source,
  options,
}) => {
  assertTtl();

  if (
    !source ||
    typeof source !== 'object'
  ) {
    throw new TypeError(
      'Review source is required.',
    );
  }

  if (
    !options ||
    typeof options !== 'object'
  ) {
    throw new TypeError(
      'Review options are required.',
    );
  }

  const redis =
    getRedisConnection();

  const key =
    createReviewSourceKey(
      reviewId,
    );

  const payload =
    JSON.stringify({
      source,
      options,
    });

  await redis.set(
    key,
    payload,
    'EX',
    REVIEW_SOURCE_TTL_SECONDS,
  );

  return {
    key,
    ttl:
      REVIEW_SOURCE_TTL_SECONDS,
  };
};

const getReviewSource = async (
  reviewId,
) => {
  const redis =
    getRedisConnection();

  const key =
    createReviewSourceKey(
      reviewId,
    );

  const payload =
    await redis.get(
      key,
    );

  if (!payload) {
    return null;
  }

  let parsed;

  try {
    parsed =
      JSON.parse(
        payload,
      );
  } catch {
    throw new Error(
      'Stored review source data is invalid.',
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !parsed.source ||
    typeof parsed.source !== 'object' ||
    !parsed.options ||
    typeof parsed.options !== 'object'
  ) {
    throw new Error(
      'Stored review source data is incomplete.',
    );
  }

  return parsed;
};

const deleteReviewSource = async (
  reviewId,
) => {
  const redis =
    getRedisConnection();

  const key =
    createReviewSourceKey(
      reviewId,
    );

  return redis.del(
    key,
  );
};

const getReviewSourceTtl =
  async (
    reviewId,
  ) => {
    const redis =
      getRedisConnection();

    const key =
      createReviewSourceKey(
        reviewId,
      );

    return redis.ttl(
      key,
    );
  };

export {
  createReviewSourceKey,
  storeReviewSource,
  getReviewSource,
  deleteReviewSource,
  getReviewSourceTtl,
};