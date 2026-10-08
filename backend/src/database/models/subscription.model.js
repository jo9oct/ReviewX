// STATUS: CREATED

import mongoose from 'mongoose';

const { Schema } = mongoose;

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
      required: true,
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
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

export const Subscription = mongoose.model(
  'Subscription',
  subscriptionSchema,
);