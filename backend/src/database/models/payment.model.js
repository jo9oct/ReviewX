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
      enum: ['pro', 'enterprise'],
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
      enum: ['pending', 'paid', 'failed'],
      required: true,
      default: 'pending',
      lowercase: true,
      trim: true,
      index: true,
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

export const Payment = mongoose.model(
  'Payment',
  paymentSchema,
);