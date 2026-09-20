import mongoose from "mongoose";

const { Schema } = mongoose;

const reviewSummarySchema = new Schema(
  {
    totalFindings: {
      type: Number,
      min: 0,
      default: 0
    },

    critical: {
      type: Number,
      min: 0,
      default: 0
    },

    high: {
      type: Number,
      min: 0,
      default: 0
    },

    medium: {
      type: Number,
      min: 0,
      default: 0
    },

    low: {
      type: Number,
      min: 0,
      default: 0
    },

    info: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    _id: false,
    strict: true
  }
);

const reviewSchema = new Schema(
  {
    source: {
      type: String,
      enum: [
        "paste",
        "upload"
      ],
      required: true
    },

    fileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null
    },

    language: {
      type: String,
      trim: true,
      maxlength: 50,
      required: true
    },

    fileExtension: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 20,
      default: null
    },

    sourceSize: {
      type: Number,
      min: 0,
      required: true
    },

    status: {
      type: String,
      enum: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled"
      ],
      default: "pending",
      required: true
    },

    summary: {
      type: reviewSummarySchema,
      default: null
    },

    findingCount: {
      type: Number,
      min: 0,
      default: 0
    },

    startedAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    },

    failedAt: {
      type: Date,
      default: null
    },

    errorCode: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null
    },

    errorMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null
    }
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false
  }
);

reviewSchema.index({
  createdAt: -1
});

reviewSchema.index({
  status: 1,
  createdAt: -1
});

export const Review = mongoose.model(
  "Review",
  reviewSchema
);