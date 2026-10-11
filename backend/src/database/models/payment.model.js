// STATUS: UPDATED

import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ['pro', 'team', 'enterprise'],
      required: true,
      lowercase: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ['ETB'],
      required: true,
      default: 'ETB',
      uppercase: true,
      trim: true,
    },

    txRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    chapaReference: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
      required: true,
      default: 'pending',
      lowercase: true,
      trim: true,
      index: true,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },

    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly',
      lowercase: true,
      trim: true,
    },

    receiptNumber: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },

    chapaVerifyResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },

    refundDetails: {
      refundedAt: { type: Date, default: null },
      refundedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      reason: { type: String, default: '' },
      revokedSubscription: { type: Boolean, default: false },
    },

    checkoutUrl: {
      type: String,
      default: null,
      trim: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({
  userId: 1,
  createdAt: -1,
});

paymentSchema.index({
  status: 1,
  createdAt: -1,
});

paymentSchema.index({
  plan: 1,
  status: 1,
});

paymentSchema.index({
  status: 1,
  plan: 1,
  createdAt: -1,
});

export const Payment = mongoose.model(
  'Payment',
  paymentSchema,
);