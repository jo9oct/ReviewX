import mongoose from 'mongoose';

const reviewItemSchema =
  new mongoose.Schema(
    {
      reviewId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () =>
          new mongoose.Types.ObjectId(),
        required: true,
      },

      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null,
      },

      sourceType: {
        type: String,
        enum: [
          'paste',
          'upload',
          'archive',
          'github',
        ],
        required: true,
      },

      status: {
        type: String,
        enum: [
          'pending',
          'queued',
          'running',
          'completed',
          'failed',
          'cancelled',
        ],
        default: 'pending',
        required: true,
      },

      languages: {
        type: [String],
        default: [],
      },

      totalFiles: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalLines: {
        type: Number,
        default: 0,
        min: 0,
      },

      findingCounts: {
        critical: {
          type: Number,
          default: 0,
          min: 0,
        },

        high: {
          type: Number,
          default: 0,
          min: 0,
        },

        medium: {
          type: Number,
          default: 0,
          min: 0,
        },

        low: {
          type: Number,
          default: 0,
          min: 0,
        },

        info: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      score: {
        type: Number,
        default: null,
        min: 0,
        max: 100,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      errorCode: {
        type: String,
        default: null,
      },
    },
    {
      _id: false,
      timestamps: true,
    },
  );

const reviewSchema =
  new mongoose.Schema(
    {
      ownerId: {
        type: String,
        required: true,
        trim: true,
      },

      reviews: {
        type: [reviewItemSchema],
        default: [],
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

reviewSchema.index({
  ownerId: 1,
});

const Review =
  mongoose.model(
    'Review',
    reviewSchema,
  );

export default Review;