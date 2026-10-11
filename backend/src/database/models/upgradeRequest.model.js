/**
 * UpgradeRequest model
 *
 * Stores requests from company admins/members asking the owner to upgrade
 * the workspace subscription.  Rate-limited to one pending request per
 * user per 24 hours.
 */

import mongoose from 'mongoose';

const upgradeRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    companyId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Company',
      required: true,
    },

    message: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: 500,
    },

    status: {
      type:    String,
      enum:    ['pending', 'acknowledged'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

upgradeRequestSchema.index({ requesterId: 1, createdAt: -1 });
upgradeRequestSchema.index({ companyId: 1, status: 1 });

export const UpgradeRequest = mongoose.model('UpgradeRequest', upgradeRequestSchema);
export default UpgradeRequest;
