import mongoose from 'mongoose';

import Review from '../models/review.model.js';

const normalizeOwnerId = (
  ownerId,
) => {
  if (
    typeof ownerId !== 'string' ||
    !ownerId.trim()
  ) {
    throw new TypeError(
      'Owner ID is required.',
    );
  }

  return ownerId.trim();
};

const normalizeReviewId = (
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

  return reviewId.trim();
};

const normalizeObjectId = (
  value,
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      value,
    )
  ) {
    throw new TypeError(
      'Invalid review ID.',
    );
  }

  return new mongoose.Types.ObjectId(
    value,
  );
};

const attachOwnerId = (
  review,
  ownerId,
) => {
  if (!review) {
    return null;
  }

  return {
    ...review,

    ownerId,
  };
};

const create = async (
  data,
) => {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new TypeError(
      'Review data is required.',
    );
  }

  const {
    ownerId,
    ...reviewData
  } = data;

  const normalizedOwnerId =
    normalizeOwnerId(
      ownerId,
    );

  const reviewId =
    reviewData.reviewId ||
    new mongoose.Types.ObjectId();

  const review = {
    ...reviewData,

    reviewId,
  };

  const result =
    await Review.findOneAndUpdate(
      {
        ownerId:
          normalizedOwnerId,
      },

      {
        $push: {
          reviews:
            review,
        },
      },

      {
        new: true,

        upsert: true,

        setDefaultsOnInsert:
          true,

        runValidators:
          true,
      },
    ).lean();

  if (!result) {
    return null;
  }

  const createdReview =
    result.reviews?.find(
      (item) =>
        String(
          item.reviewId,
        ) ===
        String(reviewId),
    );

  if (!createdReview) {
    return null;
  }

  return attachOwnerId(
    createdReview,
    result.ownerId ||
      normalizedOwnerId,
  );
};

const findById = async (
  reviewId,
) => {
  const normalizedReviewId =
    normalizeReviewId(
      reviewId,
    );

  const objectId =
    normalizeObjectId(
      normalizedReviewId,
    );

  const result =
    await Review.findOne({
      reviews: {
        $elemMatch: {
          reviewId:
            objectId,
        },
      },
    }).lean();

  if (!result) {
    return null;
  }

  const review =
    result.reviews?.find(
      (item) =>
        String(
          item.reviewId,
        ) ===
        String(objectId),
    );

  return attachOwnerId(
    review,
    result.ownerId,
  );
};

const findByOwnerId = async (
  ownerId,
) => {
  const normalizedOwnerId =
    normalizeOwnerId(
      ownerId,
    );

  const result =
    await Review.findOne({
      ownerId:
        normalizedOwnerId,
    }).lean();

  if (!result) {
    return [];
  }

  return (
    result.reviews || []
  ).map(
    (review) =>
      attachOwnerId(
        review,
        result.ownerId,
      ),
  );
};

const findMany = async (
  filter = {},
  options = {},
) => {
  if (
    !filter ||
    typeof filter !== 'object' ||
    Array.isArray(filter)
  ) {
    throw new TypeError(
      'Review filter must be an object.',
    );
  }

  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      'Review options must be an object.',
    );
  }

  const {
    limit = 50,
    skip = 0,
  } = options;

  if (
    !Number.isInteger(limit) ||
    limit < 1
  ) {
    throw new TypeError(
      'Review limit must be a positive integer.',
    );
  }

  if (
    !Number.isInteger(skip) ||
    skip < 0
  ) {
    throw new TypeError(
      'Review skip must be a non-negative integer.',
    );
  }

  const {
    ownerId,
    ...reviewFilter
  } = filter;

  const query = {};

  if (ownerId) {
    query.ownerId =
      normalizeOwnerId(
        ownerId,
      );
  }

  const filterEntries =
    Object.entries(
      reviewFilter,
    );

  if (
    filterEntries.length > 0
  ) {
    query.reviews = {
      $elemMatch:
        Object.fromEntries(
          filterEntries,
        ),
    };
  }

  const documents =
    await Review.find(
      query,
    )
      .sort({
        updatedAt: -1,
      })
      .lean();

  const reviews =
    documents.flatMap(
      (document) =>
        (
          document.reviews ||
          []
        ).map(
          (review) =>
            attachOwnerId(
              review,
              document.ownerId,
            ),
        ),
    );

  return reviews
    .sort(
      (a, b) =>
        new Date(
          b.updatedAt ||
            b.createdAt ||
            0,
        ) -
        new Date(
          a.updatedAt ||
            a.createdAt ||
            0,
        ),
    )
    .slice(
      skip,
      skip + limit,
    );
};

const updateById = async (
  reviewId,
  update,
) => {
  const normalizedReviewId =
    normalizeReviewId(
      reviewId,
    );

  const objectId =
    normalizeObjectId(
      normalizedReviewId,
    );

  if (
    !update ||
    typeof update !== 'object' ||
    Array.isArray(update)
  ) {
    throw new TypeError(
      'Review update is required.',
    );
  }

  const updateEntries =
    Object.entries(
      update,
    );

  if (
    updateEntries.length === 0
  ) {
    throw new TypeError(
      'Review update cannot be empty.',
    );
  }

  const nestedUpdates =
    Object.fromEntries(
      updateEntries.map(
        ([
          key,
          value,
        ]) => [
          `reviews.$.${key}`,
          value,
        ],
      ),
    );

  const result =
    await Review.findOneAndUpdate(
      {
        reviews: {
          $elemMatch: {
            reviewId:
              objectId,
          },
        },
      },

      {
        $set:
          nestedUpdates,
      },

      {
        new: true,

        runValidators:
          true,
      },
    ).lean();

  if (!result) {
    return null;
  }

  const review =
    result.reviews?.find(
      (item) =>
        String(
          item.reviewId,
        ) ===
        String(objectId),
    );

  return attachOwnerId(
    review,
    result.ownerId,
  );
};

const updateByIdAndStatus =
  async (
    reviewId,
    currentStatus,
    update,
  ) => {
    const normalizedReviewId =
      normalizeReviewId(
        reviewId,
      );

    const objectId =
      normalizeObjectId(
        normalizedReviewId,
      );

    if (
      typeof currentStatus !==
        'string' ||
      !currentStatus.trim()
    ) {
      throw new TypeError(
        'Current review status is required.',
      );
    }

    if (
      !update ||
      typeof update !==
        'object' ||
      Array.isArray(update)
    ) {
      throw new TypeError(
        'Review update is required.',
      );
    }

    const updateEntries =
      Object.entries(
        update,
      );

    if (
      updateEntries.length ===
      0
    ) {
      throw new TypeError(
        'Review update cannot be empty.',
      );
    }

    const nestedUpdates =
      Object.fromEntries(
        updateEntries.map(
          ([
            key,
            value,
          ]) => [
            `reviews.$.${key}`,
            value,
          ],
        ),
      );

    /*
     * $elemMatch guarantees that
     * reviewId and status belong to
     * the same nested review.
     */
    const result =
      await Review.findOneAndUpdate(
        {
          reviews: {
            $elemMatch: {
              reviewId:
                objectId,

              status:
                currentStatus.trim(),
            },
          },
        },

        {
          $set:
            nestedUpdates,
        },

        {
          new: true,

          runValidators:
            true,
        },
      ).lean();

    if (!result) {
      return null;
    }

    const review =
      result.reviews?.find(
        (item) =>
          String(
            item.reviewId,
          ) ===
          String(objectId),
      );

    return attachOwnerId(
      review,
      result.ownerId,
    );
  };

const count = async (
  filter = {},
) => {
  if (
    !filter ||
    typeof filter !== 'object' ||
    Array.isArray(filter)
  ) {
    throw new TypeError(
      'Review filter must be an object.',
    );
  }

  const {
    ownerId,
    ...reviewFilter
  } = filter;

  const query = {};

  if (ownerId) {
    query.ownerId =
      normalizeOwnerId(
        ownerId,
      );
  }

  const filterEntries =
    Object.entries(
      reviewFilter,
    );

  if (
    filterEntries.length > 0
  ) {
    query.reviews = {
      $elemMatch:
        Object.fromEntries(
          filterEntries,
        ),
    };
  }

  const documents =
    await Review.find(
      query,
    )
      .select({
        ownerId: 1,
        reviews: 1,
      })
      .lean();

  return documents.reduce(
    (
      total,
      document,
    ) =>
      total +
      (
        document.reviews ||
        []
      ).length,
    0,
  );
};

const reviewRepository =
  Object.freeze({
    create,
    findById,
    findByOwnerId,
    findMany,
    updateById,
    updateByIdAndStatus,
    count,
  });

export {
  create,
  findById,
  findByOwnerId,
  findMany,
  updateById,
  updateByIdAndStatus,
  count,
  reviewRepository,
};

export default reviewRepository;