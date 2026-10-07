import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      index: true
    },

    findingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Finding',
      required: true,
      index: true
    },

    filePath: {
      type: String,
      required: true
    },

    lineStart: {
      type: Number,
      required: true,
      min: 1
    },

    lineEnd: {
      type: Number,
      required: true,
      min: 1
    },

    snippet: {
      type: String,
      required: true
    },

    sourceHash: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

evidenceSchema.index({
  reviewId: 1,
  findingId: 1
});

const Evidence = mongoose.model('Evidence', evidenceSchema);

export { Evidence };
export default Evidence;