import mongoose from "mongoose";

const { Schema } = mongoose;

const aiAnalysisSchema = new Schema(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      unique: true,
      index: true
    },

    provider: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null
    },

    model: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null
    },

    status: {
      type: String,
      enum: [
        "completed",
        "failed",
        "skipped",
        "not_available",
        "limit_reached"
      ],
      required: true
    },

    summary: {
      type: String,
      trim: true,
      maxlength: 20000,
      default: null
    },

    findings: {
      type: [
        {
          findingId: {
            type: Schema.Types.ObjectId,
            ref: "Finding",
            required: true
          },

          explanation: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: null
          },

          impact: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: null
          },

          fix: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: null
          },

          improvedCode: {
            type: String,
            maxlength: 20000,
            default: null
          },

          securityExplanation: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: null
          }
        }
      ],
      default: []
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

export const AiAnalysis =
  mongoose.model(
    "AiAnalysis",
    aiAnalysisSchema
  );