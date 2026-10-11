/**
 * Invitation model — a single-use, expiring invitation to join a company.
 *
 * Security properties:
 *   • The raw token is never stored — only its SHA-256 hash (`tokenHash`).
 *   • `status` transitions are applied atomically (single-use guard):
 *     pending → accepted | revoked.
 *   • Invitations expire after `expiresAt`; expired pending invites are
 *     rejected on read/accept.
 *
 * Invitations always grant the `member` role — company_admin is reserved
 * for the company owner (product decision).
 */

import mongoose from 'mongoose';

export const INVITATION_TTL_DAYS = 7;

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type:     String,
      required: [true, 'Invitation email is required'],
      lowercase: true,
      trim:     true,
      index:    true,
    },

    company: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Company',
      required: true,
      index:    true,
    },

    role: {
      type:    String,
      enum:    ['member'],
      default: 'member',
    },

    invitedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    tokenHash: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },

    status: {
      type:    String,
      enum:    ['pending', 'accepted', 'revoked'],
      default: 'pending',
      index:   true,
    },

    expiresAt: {
      type:     Date,
      required: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    acceptedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      default:  null,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

// One live invitation per email per company.
invitationSchema.index({ company: 1, email: 1, status: 1 });

export const Invitation = mongoose.model('Invitation', invitationSchema);
