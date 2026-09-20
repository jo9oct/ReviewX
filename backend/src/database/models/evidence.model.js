
import mongoose from "mongoose";

const { Schema } = mongoose;

const evidenceSchema = new Schema(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true
    },

    findingId: {
      type: Schema.Types.ObjectId,
      ref: "Finding",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: [
        "source",
        "pattern",
        "rule",
        "context"
      ],
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
      required: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null
    }
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false
  }
);

evidenceSchema.index({
  findingId: 1,
  createdAt: 1
});

export const Evidence = mongoose.model(
  "Evidence",
  evidenceSchema
);