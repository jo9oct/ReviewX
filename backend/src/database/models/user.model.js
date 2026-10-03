/**
 * User model.
 *
 * Roles:
 *   member          — individual developer; runs reviews, sees own findings
 *   company_admin   — manages team, rules, and billing for their company
 *   platform_admin  — ReviewX superadmin; full access to all data
 *
 * The `company` field links a user to their organisation.
 * platform_admin users have company: null (they own the platform, not a tenant).
 */

import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      minlength: [2,  'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    /**
     * bcrypt hash — never returned in API responses.
     * `select: false` means Mongoose omits this field unless you
     * explicitly call `.select('+passwordHash')`.
     */
    passwordHash: {
      type:     String,
      required: [true, 'Password is required'],
      select:   false,
    },

    role: {
      type:    String,
      enum: {
        values:  ['member', 'company_admin', 'platform_admin'],
        message: 'Role must be member, company_admin, or platform_admin',
      },
      default: 'member',
    },

    /**
     * The organisation this user belongs to.
     * null  → platform_admin (no tenant)
     * ObjectId → member or company_admin tied to a Company document
     */
    company: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Company',
      default: null,
    },

    /** Soft-ban flag — set to false to disable login without deleting data */
    isActive: {
      type:    Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // passwordHash must NEVER appear in any serialised response
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ company: 1 });

// ── Instance methods ──────────────────────────────────────────────────────────

/**
 * Hash a plain-text password and store the bcrypt result on this document.
 * Always call this before `save()` when setting a new password.
 */
userSchema.methods.setPassword = async function (plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a plain-text password to the stored bcrypt hash.
 * bcrypt.compare is constant-time — safe against timing attacks.
 *
 * @param   {string}  plainPassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.verifyPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/**
 * Safe public projection — strips internal / sensitive fields.
 * Use when building response payloads manually.
 */
userSchema.methods.toPublic = function () {
  return {
    id:          this._id,
    name:        this.name,
    email:       this.email,
    role:        this.role,
    company:     this.company,
    isActive:    this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt:   this.createdAt,
    updatedAt:   this.updatedAt,
  };
};

export const User = mongoose.model('User', userSchema);
