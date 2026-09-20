
import mongoose from "mongoose";

const { Schema } = mongoose;

const findingSchema = new Schema(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true
    },

    category: {
      type: String,
      enum: [
        "security",
        "bug",
        "quality",
        "performance"
      ],
      required: true
    },

    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    ruleId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000
    },

    severity: {
      type: String,
      enum: [
        "critical",
        "high",
        "medium",
        "low",
        "info"
      ],
      required: true
    },

    confidence: {
      type: String,
      enum: [
        "low",
        "medium",
        "high"
      ],
      required: true
    },

    status: {
      type: String,
      enum: [
        "detected",
        "verified",
        "false_positive",
        "accepted",
        "resolved"
      ],
      default: "detected",
      required: true
    },

    file: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null
    },

    line: {
      type: Number,
      min: 1,
      default: null
    },

    column: {
      type: Number,
      min: 1,
      default: null
    },

    code: {
      type: String,
      maxlength: 10000,
      default: null
    },

    recommendation: {
      type: String,
      trim: true,
      maxlength: 10000,
      default: null
    },

    analyzer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    fingerprint: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    }
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false
  }
);

findingSchema.index({
  reviewId: 1,
  createdAt: 1
});

findingSchema.index({
  reviewId: 1,
  fingerprint: 1
});

findingSchema.index({
  reviewId: 1,
  severity: 1
});

export const Finding = mongoose.model(
  "Finding",
  findingSchema
);