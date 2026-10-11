// STATUS: CREATED

import mongoose from 'mongoose';

const { Schema } = mongoose;

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ['free', 'pro', 'team', 'enterprise'],
      default: 'free',
      required: true,
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'expired', 'cancelled'],
      default: 'active',
      required: true,
      lowercase: true,
      trim: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    // Plan-specific limits (populated from plans collection)
    monthlyReviews: {
      type: Number,
      default: 0,
    },
    aiAssistedReviews: {
      type: Number,
      default: 0,
    },
    linesPerReview: {
      type: Number,
      default: 1000,
    },
    filesPerReview: {
      type: Number,
      default: 50,
    },
    historyRetentionDays: {
      type: Number,
      default: 30,
    },
    seats: {
      type: Number,
      default: 0,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },

    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly',
      lowercase: true,
      trim: true,
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    customLimits: {
      type: Schema.Types.Mixed,
      default: {},
    },

    statusHistory: [
      {
        fromStatus: { type: String, default: null },
        toStatus: { type: String, required: true },
        reason: { type: String, default: '' },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        changedAt: { type: Date, default: Date.now },
      },
    ],

    pendingPlanChange: {
      targetPlan: { type: String, default: null },
      effectiveDate: { type: Date, default: null },
      scheduledAt: { type: Date, default: null },
      reason: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  },
);

subscriptionSchema.index({
  plan: 1,
  status: 1,
});

subscriptionSchema.index({
  expiresAt: 1,
});

subscriptionSchema.index({
  status: 1,
  expiresAt: 1,
});

subscriptionSchema.index({
  status: 1,
  updatedAt: -1,
});

subscriptionSchema.index({
  plan: 1,
  createdAt: -1,
});

// Ensures each company has at most one subscription document.
// sparse: true means documents with companyId: null are excluded from the constraint.
subscriptionSchema.index({ companyId: 1 }, { unique: true, sparse: true });

export const Subscription = mongoose.model(
  'Subscription',
  subscriptionSchema,
);