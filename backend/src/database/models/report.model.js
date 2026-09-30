import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      index: true
    },

    format: {
      type: String,
      enum: ['json', 'html', 'pdf'],
      required: true
    },

    status: {
      type: String,
      enum: [
        'pending',
        'generating',
        'completed',
        'failed'
      ],
      default: 'pending',
      required: true,
      index: true
    },

    storageProvider: {
      type: String,
      enum: ['cloudinary'],
      default: null
    },

    publicId: {
      type: String,
      default: null
    },

    secureUrl: {
      type: String,
      default: null
    },

    resourceType: {
      type: String,
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

reportSchema.index({
  reviewId: 1,
  format: 1
});

const Report = mongoose.model('Report', reportSchema);

export default Report;