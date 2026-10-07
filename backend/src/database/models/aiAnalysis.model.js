import mongoose from 'mongoose';

const aiAnalysisSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      index: true
    },

    provider: {
      type: String,
      enum: ['groq', 'openai'],
      required: true
    },

    model: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: [
        'pending',
        'running',
        'completed',
        'failed',
        'skipped'
      ],
      required: true,
      index: true
    },

    analysisType: {
      type: String,
      enum: [
        'finding_analysis',
        'security_review',
        'code_improvement',
        'summary'
      ],
      required: true
    },

    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    usage: {
      promptTokens: {
        type: Number,
        default: null,
        min: 0
      },
      completionTokens: {
        type: Number,
        default: null,
        min: 0
      },
      totalTokens: {
        type: Number,
        default: null,
        min: 0
      }
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

aiAnalysisSchema.index({
  reviewId: 1,
  analysisType: 1
});

const AiAnalysis = mongoose.model(
  'AiAnalysis',
  aiAnalysisSchema
);

export { AiAnalysis };
export default AiAnalysis;