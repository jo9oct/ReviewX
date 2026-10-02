import mongoose from 'mongoose';

import ScheduledReview from '../models/scheduledReview.model.js';

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

const normalizeScheduleId = (
  scheduleId,
) => {
  if (
    typeof scheduleId !== 'string' ||
    !scheduleId.trim()
  ) {
    throw new TypeError(
      'Schedule ID is required.',
    );
  }

  return scheduleId.trim();
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
  message,
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      value,
    )
  ) {
    throw new TypeError(
      message,
    );
  }

  return new mongoose.Types.ObjectId(
    value,
  );
};

const create = async ({
  ownerId,
  reviewId,
  intervalSeconds,
  nextRunAt,
}) => {
  const normalizedOwnerId =
    normalizeOwnerId(
      ownerId,
    );

  const normalizedReviewId =
    normalizeReviewId(
      reviewId,
    );

  const reviewObjectId =
    normalizeObjectId(
      normalizedReviewId,
      'Invalid review ID.',
    );

  if (
    !Number.isInteger(
      intervalSeconds,
    ) ||
    intervalSeconds < 60
  ) {
    throw new TypeError(
      'Schedule interval must be at least 60 seconds.',
    );
  }

  const normalizedNextRunAt =
    new Date(nextRunAt);

  if (
    Number.isNaN(
      normalizedNextRunAt.getTime(),
    )
  ) {
    throw new TypeError(
      'A valid next run time is required.',
    );
  }

  const schedule =
    await ScheduledReview.create({
      ownerId:
        normalizedOwnerId,

      reviewId:
        reviewObjectId,

      intervalSeconds,

      nextRunAt:
        normalizedNextRunAt,

      enabled:
        true,
    });

  return schedule.toObject();
};

const findById = async (
  scheduleId,
) => {
  const normalizedScheduleId =
    normalizeScheduleId(
      scheduleId,
    );

  const objectId =
    normalizeObjectId(
      normalizedScheduleId,
      'Invalid schedule ID.',
    );

  return ScheduledReview.findOne({
    scheduleId:
      objectId,
  }).lean();
};

const findByOwnerId = async (
  ownerId,
) => {
  const normalizedOwnerId =
    normalizeOwnerId(
      ownerId,
    );

  return ScheduledReview.find({
    ownerId:
      normalizedOwnerId,
  })
    .sort({
      createdAt: -1,
    })
    .lean();
};

const findDue = async ({
  now = new Date(),
  limit = 100,
}) => {
  const normalizedNow =
    new Date(now);

  if (
    Number.isNaN(
      normalizedNow.getTime(),
    )
  ) {
    throw new TypeError(
      'A valid current time is required.',
    );
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1
  ) {
    throw new TypeError(
      'Schedule limit must be a positive integer.',
    );
  }

  return ScheduledReview.find({
    enabled: true,

    nextRunAt: {
      $lte:
        normalizedNow,
    },
  })
    .sort({
      nextRunAt: 1,
    })
    .limit(limit)
    .lean();
};

const claimDueSchedule = async ({
  scheduleId,
  now = new Date(),
}) => {
  const normalizedScheduleId =
    normalizeScheduleId(
      scheduleId,
    );

  const objectId =
    normalizeObjectId(
      normalizedScheduleId,
      'Invalid schedule ID.',
    );

  const normalizedNow =
    new Date(now);

  if (
    Number.isNaN(
      normalizedNow.getTime(),
    )
  ) {
    throw new TypeError(
      'A valid current time is required.',
    );
  }

  /*
   * Read the currently due schedule.
   *
   * This gives us the interval needed
   * to calculate the next execution time.
   */
  const schedule =
    await ScheduledReview.findOne({
      scheduleId:
        objectId,

      enabled:
        true,

      nextRunAt: {
        $lte:
          normalizedNow,
      },
    }).lean();

  if (!schedule) {
    return null;
  }

  const nextRunAt =
    new Date(
      normalizedNow.getTime() +
        schedule.intervalSeconds *
          1000,
    );

  /*
   * Atomically claim the schedule.
   *
   * If another scheduler has already
   * claimed it, this update returns null.
   */
  return ScheduledReview.findOneAndUpdate(
    {
      scheduleId:
        objectId,

      enabled:
        true,

      nextRunAt: {
        $lte:
          normalizedNow,
      },
    },
    {
      $set: {
        lastRunAt:
          normalizedNow,

        nextRunAt,
      },
    },
    {
      new: true,

      runValidators:
        true,
    },
  ).lean();
};

const advanceSchedule = async ({
  scheduleId,
  nextRunAt,
}) => {
  const normalizedScheduleId =
    normalizeScheduleId(
      scheduleId,
    );

  const objectId =
    normalizeObjectId(
      normalizedScheduleId,
      'Invalid schedule ID.',
    );

  const normalizedNextRunAt =
    new Date(nextRunAt);

  if (
    Number.isNaN(
      normalizedNextRunAt.getTime(),
    )
  ) {
    throw new TypeError(
      'A valid next run time is required.',
    );
  }

  return ScheduledReview.findOneAndUpdate(
    {
      scheduleId:
        objectId,

      enabled:
        true,
    },
    {
      $set: {
        nextRunAt:
          normalizedNextRunAt,
      },
    },
    {
      new: true,

      runValidators:
        true,
    },
  ).lean();
};

const updateNextRunAt = async ({
  scheduleId,
  nextRunAt,
  lastRunAt,
}) => {
  const normalizedScheduleId =
    normalizeScheduleId(
      scheduleId,
    );

  const objectId =
    normalizeObjectId(
      normalizedScheduleId,
      'Invalid schedule ID.',
    );

  const normalizedNextRunAt =
    new Date(nextRunAt);

  if (
    Number.isNaN(
      normalizedNextRunAt.getTime(),
    )
  ) {
    throw new TypeError(
      'A valid next run time is required.',
    );
  }

  const updates = {
    nextRunAt:
      normalizedNextRunAt,
  };

  if (
    lastRunAt !== undefined
  ) {
    const normalizedLastRunAt =
      new Date(lastRunAt);

    if (
      Number.isNaN(
        normalizedLastRunAt.getTime(),
      )
    ) {
      throw new TypeError(
        'A valid last run time is required.',
      );
    }

    updates.lastRunAt =
      normalizedLastRunAt;
  }

  return ScheduledReview.findOneAndUpdate(
    {
      scheduleId:
        objectId,

      enabled:
        true,
    },
    {
      $set:
        updates,
    },
    {
      new: true,

      runValidators:
        true,
    },
  ).lean();
};

const disable = async (
  scheduleId,
) => {
  const normalizedScheduleId =
    normalizeScheduleId(
      scheduleId,
    );

  const objectId =
    normalizeObjectId(
      normalizedScheduleId,
      'Invalid schedule ID.',
    );

  return ScheduledReview.findOneAndUpdate(
    {
      scheduleId:
        objectId,
    },
    {
      $set: {
        enabled:
          false,
      },
    },
    {
      new: true,

      runValidators:
        true,
    },
  ).lean();
};

const scheduledReviewRepository =
  Object.freeze({
    create,

    findById,

    findByOwnerId,

    findDue,

    claimDueSchedule,

    advanceSchedule,

    updateNextRunAt,

    disable,
  });

export {
  create,

  findById,

  findByOwnerId,

  findDue,

  claimDueSchedule,

  advanceSchedule,

  updateNextRunAt,

  disable,

  scheduledReviewRepository,
};

export default
  scheduledReviewRepository;