import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true
    },

    sourceType: {
      type: String,
      enum: ['paste', 'upload', 'archive', 'github'],
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: [
        'pending',
        'queued',
        'running',
        'completed',
        'failed',
        'cancelled'
      ],
      default: 'pending',
      required: true,
      index: true
    },

    languages: {
      type: [String],
      default: []
    },

    totalFiles: {
      type: Number,
      default: 0,
      min: 0
    },

    totalLines: {
      type: Number,
      default: 0,
      min: 0
    },

    findingCounts: {
      critical: {
        type: Number,
        default: 0,
        min: 0
      },
      high: {
        type: Number,
        default: 0,
        min: 0
      },
      medium: {
        type: Number,
        default: 0,
        min: 0
      },
      low: {
        type: Number,
        default: 0,
        min: 0
      },
      info: {
        type: Number,
        default: 0,
        min: 0
      }
    },

    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },

    startedAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    },

    errorCode: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

reviewSchema.index({
  status: 1,
  createdAt: -1
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;