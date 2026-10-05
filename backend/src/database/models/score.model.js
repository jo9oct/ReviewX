import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      unique: true,
      index: true
    },

    overall: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    security: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    bugs: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    quality: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    performance: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    calculatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Score = mongoose.model('Score', scoreSchema);

export default Score;