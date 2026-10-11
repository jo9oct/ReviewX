import mongoose from 'mongoose';

const { Schema } = mongoose;

const planSchema = new Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      enum: ['free', 'pro', 'team', 'enterprise'],
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    priceMonthly: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    priceAnnual: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true,
      trim: true,
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    limits: {
      monthlyReviews: { type: Number, default: 50 },
      aiAssistedReviews: { type: Number, default: 5 },
      linesPerReview: { type: Number, default: 1000 },
      filesPerReview: { type: Number, default: 50 },
      historyRetentionDays: { type: Number, default: 30 },
      seats: { type: Number, default: 0 },
    },
    features: {
      advancedAnalysis: { type: Boolean, default: false },
      aiRemediation: { type: Boolean, default: false },
      gitHubIntegration: { type: Boolean, default: false },
      htmlReport: { type: Boolean, default: false },
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

export const Plan = mongoose.model('Plan', planSchema);
export default Plan;
