/**
 * Company model — a tenant (organisation) in ReviewX.
 *
 * Created when a company owner signs up via `POST /auth/register`
 * with `accountType: "company_owner"`. The owner is linked back via
 * `user.company`; `owner` points at the user who created it.
 *
 * platform_admin users have company: null (they own the platform, not a tenant).
 */

import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Company name is required'],
      trim:      true,
      minlength: [2,  'Company name must be at least 2 characters'],
      maxlength: [100, 'Company name must be at most 100 characters'],
    },

    slug: {
      type:     String,
      required: true,
      unique:   true,
      lowercase: true,
      trim:     true,
      index:    true,
    },

    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

companySchema.index({ owner: 1 });

export const Company = mongoose.model('Company', companySchema);
