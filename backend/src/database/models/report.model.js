import mongoose from "mongoose";

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: [
        "json",
        "html",
        "pdf"
      ],
      required: true
    },

    status: {
      type: String,
      enum: [
        "pending",
        "generating",
        "completed",
        "failed"
      ],
      default: "pending",
      required: true
    },

    fileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null
    },

    content: {
      type: String,
      default: null
    },

    storageProvider: {
      type: String,
      enum: [
        "local",
        "cloudinary"
      ],
      default: "local"
    },

    storageUrl: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null
    },

    publicId: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null
    },

    filePath: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null
    },

    error: {
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

reportSchema.index({
  reviewId: 1,
  type: 1,
  createdAt: -1
});

export const Report = mongoose.model(
  "Report",
  reportSchema
);