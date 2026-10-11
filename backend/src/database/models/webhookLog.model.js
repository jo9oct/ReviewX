import mongoose from 'mongoose';

const { Schema } = mongoose;

const webhookLogSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      default: 'chapa',
      trim: true,
      index: true,
    },
    txRef: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    signatureValid: {
      type: Boolean,
      default: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    processingStatus: {
      type: String,
      enum: ['processed', 'failed', 'ignored'],
      default: 'processed',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    replayedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

webhookLogSchema.index({ createdAt: -1 });

export const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);
export default WebhookLog;
