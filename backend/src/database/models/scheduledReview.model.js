import mongoose from 'mongoose';

const scheduledReviewSchema =
  new mongoose.Schema(
    {
      scheduleId: {
        type:
          mongoose.Schema.Types.ObjectId,

        default: () =>
          new mongoose.Types.ObjectId(),

        required: true,
      },

      ownerId: {
        type: String,

        required: true,

        trim: true,
      },

      reviewId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required: true,
      },

      intervalSeconds: {
        type: Number,

        required: true,

        min: 60,
      },

      nextRunAt: {
        type: Date,

        required: true,
      },

      lastRunAt: {
        type: Date,

        default: null,
      },

      enabled: {
        type: Boolean,

        default: true,

        required: true,
      },
    },

    {
      timestamps: true,

      versionKey: false,
    },
  );

scheduledReviewSchema.index({
  enabled: 1,

  nextRunAt: 1,
});

scheduledReviewSchema.index({
  ownerId: 1,
});

scheduledReviewSchema.index({
  reviewId: 1,
});

const ScheduledReview =
  mongoose.model(
    'ScheduledReview',
    scheduledReviewSchema,
  );

export { ScheduledReview };
export default ScheduledReview;