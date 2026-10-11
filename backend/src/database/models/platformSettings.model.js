import mongoose from 'mongoose';

const { Schema } = mongoose;

const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'php',
  'go',
  'c',
  'cpp',
  'csharp',
];

const SUPPORTED_PROVIDERS = ['groq', 'openai'];

const platformSettingsSchema = new Schema(
  {
    // ── Section 1: General ───────────────────────────────────────────────────
    general: {
      platformName: {
        type: String,
        default: 'ReviewX',
        trim: true,
        maxlength: 80,
      },
      supportEmail: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
      },
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
      announcementBanner: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500,
      },
    },

    // ── Section 2: Access & Registration ─────────────────────────────────────
    access: {
      allowPublicSignup: {
        type: Boolean,
        default: true,
      },
      requireEmailVerification: {
        type: Boolean,
        default: false,
      },
    },

    // ── Section 3: AI Providers ───────────────────────────────────────────────
    ai: {
      killSwitch: {
        type: Boolean,
        default: false,
      },
      activeProvider: {
        type: String,
        enum: SUPPORTED_PROVIDERS,
        default: 'groq',
      },
      activeModel: {
        type: String,
        default: '',
        trim: true,
      },
      estimatedCostPerCallETB: {
        type: Number,
        default: 3,
        min: 0,
        max: 1000,
      },
    },

    // ── Section 4: Review Engine ──────────────────────────────────────────────
    reviewEngine: {
      enabledLanguages: {
        type: [String],
        default: [...SUPPORTED_LANGUAGES],
        validate: {
          validator: (arr) =>
            Array.isArray(arr) &&
            arr.length > 0 &&
            arr.every((l) => SUPPORTED_LANGUAGES.includes(l)),
          message: 'At least one valid language must be enabled.',
        },
      },
      globalMaxLinesPerReview: {
        type: Number,
        default: 10000,
        min: 100,
        max: 100000,
      },
      globalMaxFileSizeBytes: {
        type: Number,
        default: 1048576, // 1 MB
        min: 1024,
        max: 104857600, // 100 MB
      },
    },

    // ── Section 5: Billing Config ─────────────────────────────────────────────
    billing: {
      gracePeriodDays: {
        type: Number,
        default: 3,
        min: 1,
        max: 30,
      },
      receiptCompanyName: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200,
      },
      receiptAddress: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500,
      },
      receiptTaxId: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100,
      },
    },

    // ── Metadata ──────────────────────────────────────────────────────────────
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: 'platform_settings',
  },
);

/**
 * Get or create the single platform settings document.
 * Always returns a plain object (lean).
 */
platformSettingsSchema.statics.getEffective = async function () {
  let doc = await this.findOne().lean();
  if (!doc) {
    doc = await this.create({});
    doc = doc.toObject ? doc.toObject() : doc;
  }
  return doc;
};

export const PLATFORM_SETTINGS_SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
export const PLATFORM_SETTINGS_SUPPORTED_PROVIDERS = SUPPORTED_PROVIDERS;

export const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);
export default PlatformSettings;
