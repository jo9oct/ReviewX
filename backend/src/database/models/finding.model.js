import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },

    category: {
      type: String,
      enum: [
        'security',
        'bug',
        'quality',
        'performance',
      ],
      required: true,
      index: true,
    },

    ruleId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    severity: {
      type: String,
      enum: [
        'critical',
        'high',
        'medium',
        'low',
        'info',
      ],
      required: true,
      index: true,
    },

    confidence: {
      type: String,
      enum: [
        'low',
        'medium',
        'high',
      ],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        'detected',
        'verified',
        'false_positive',
        'accepted',
        'resolved',
      ],
      default: 'detected',
      required: true,
      index: true,
    },

    filePath: {
      type: String,
      required: true,
      trim: true,
    },

    lineStart: {
      type: Number,
      default: null,
      min: 1,
    },

    lineEnd: {
      type: Number,
      default: null,
      min: 1,
    },

    remediation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    evidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

findingSchema.index({
  reviewId: 1,
  severity: 1,
});

findingSchema.index({
  reviewId: 1,
  category: 1,
});

findingSchema.index({
  reviewId: 1,
  status: 1,
});

const Finding = mongoose.model(
  'Finding',
  findingSchema,
);

export { Finding };
export default Finding;