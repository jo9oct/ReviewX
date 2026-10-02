import mongoose from 'mongoose';

const reportItemSchema =
  new mongoose.Schema(
    {
      reportId: {
        type:
          mongoose.Schema.Types.ObjectId,

        default: () =>
          new mongoose.Types.ObjectId(),

        required: true,
      },

      reviewId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required: true,
      },

      format: {
        type: String,

        enum: [
          'json',
          'html',
          'pdf',
        ],

        required: true,
      },

      status: {
        type: String,

        enum: [
          'pending',
          'generating',
          'completed',
          'failed',
        ],

        default: 'pending',

        required: true,
      },

      storageProvider: {
        type: String,

        enum: [
          'cloudinary',
        ],

        default: null,
      },

      publicId: {
        type: String,

        default: null,
      },

      secureUrl: {
        type: String,

        default: null,
      },

      resourceType: {
        type: String,

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

const reportSchema =
  new mongoose.Schema(
    {
      ownerId: {
        type: String,

        required: true,

        trim: true,
      },

      reports: {
        type: [
          reportItemSchema,
        ],

        default: [],
      },
    },

    {
      timestamps: true,

      versionKey: false,
    },
  );

reportSchema.index({
  ownerId: 1,
});

const Report =
  mongoose.model(
    'Report',
    reportSchema,
  );

export default Report;