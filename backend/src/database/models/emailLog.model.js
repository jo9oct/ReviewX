import mongoose from 'mongoose';

const { Schema } = mongoose;

const emailLogSchema = new Schema(
  {
    provider: { type: String, default: 'resend', trim: true, index: true },
    to: { type: String, required: true, lowercase: true, trim: true, index: true },
    subject: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      required: true,
      default: 'skipped',
      index: true,
    },
    resendId: { type: String, default: null, trim: true },
    errorMessage: { type: String, default: null, trim: true },
    mode: { type: String, default: 'api', trim: true },
  },
  { timestamps: true },
);

emailLogSchema.index({ createdAt: -1 });

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
