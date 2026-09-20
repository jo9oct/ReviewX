
import mongoose from "mongoose";

const { Schema } = mongoose;

const scoreSchema = new Schema(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      unique: true,
      index: true
    },

    overall: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },

    security: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },

    bugs: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },

    quality: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },

    performance: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },

    findingCounts: {
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
    }
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false
  }
);

export const Score = mongoose.model(
  "Score",
  scoreSchema
);