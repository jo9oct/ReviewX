/**
 * Platform Settings Service
 *
 * Manages the single PlatformSettings document.
 * All reads go through a 30-second in-memory cache.
 * Every write is audit-logged with old and new values.
 * Secrets are never stored here — only status (configured/not).
 */

import {
  PlatformSettings,
  PLATFORM_SETTINGS_SUPPORTED_LANGUAGES,
  PLATFORM_SETTINGS_SUPPORTED_PROVIDERS,
} from '../database/models/platformSettings.model.js';

import { AuditLog } from '../database/models/auditLog.model.js';
import { sendEmail } from './email.service.js';
import { ApiError } from '../utils/ApiError.js';

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;

let _cache = null;
let _cacheAt = 0;

function invalidateCache() {
  _cache = null;
  _cacheAt = 0;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getDoc() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }
  const doc = await PlatformSettings.getEffective();
  _cache = doc;
  _cacheAt = now;
  return doc;
}

async function writeAuditLog({ actor, section, before, after }) {
  try {
    await AuditLog.create({
      actorId: actor?._id || null,
      actorType: 'user',
      action: 'SETTINGS_UPDATE',
      resourceType: 'PlatformSettings',
      resourceId: section,
      status: 'success',
      metadata: {
        section,
        actorEmail: actor?.email || 'system',
        actorName: actor?.name || 'Platform Admin',
        before,
        after,
      },
    });
  } catch (err) {
    // Never let audit failure block the save
    console.error('[PlatformSettings] Audit log failed:', err.message);
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

const VALIDATORS = {
  general: (updates) => {
    if (updates.platformName !== undefined) {
      if (typeof updates.platformName !== 'string' || !updates.platformName.trim()) {
        throw ApiError.badRequest('Platform name must be a non-empty string');
      }
      if (updates.platformName.length > 80) {
        throw ApiError.badRequest('Platform name must be 80 characters or fewer');
      }
    }
    if (updates.supportEmail !== undefined && updates.supportEmail !== '') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(updates.supportEmail)) {
        throw ApiError.badRequest('Support email must be a valid email address');
      }
    }
    if (updates.maintenanceMode !== undefined && typeof updates.maintenanceMode !== 'boolean') {
      throw ApiError.badRequest('maintenanceMode must be a boolean');
    }
    if (updates.announcementBanner !== undefined) {
      if (typeof updates.announcementBanner !== 'string') {
        throw ApiError.badRequest('announcementBanner must be a string');
      }
      if (updates.announcementBanner.length > 500) {
        throw ApiError.badRequest('Announcement banner must be 500 characters or fewer');
      }
    }
  },

  access: (updates) => {
    if (updates.allowPublicSignup !== undefined && typeof updates.allowPublicSignup !== 'boolean') {
      throw ApiError.badRequest('allowPublicSignup must be a boolean');
    }
    if (
      updates.requireEmailVerification !== undefined &&
      typeof updates.requireEmailVerification !== 'boolean'
    ) {
      throw ApiError.badRequest('requireEmailVerification must be a boolean');
    }
  },

  ai: (updates) => {
    if (updates.killSwitch !== undefined && typeof updates.killSwitch !== 'boolean') {
      throw ApiError.badRequest('killSwitch must be a boolean');
    }
    if (
      updates.activeProvider !== undefined &&
      !PLATFORM_SETTINGS_SUPPORTED_PROVIDERS.includes(updates.activeProvider)
    ) {
      throw ApiError.badRequest(
        `activeProvider must be one of: ${PLATFORM_SETTINGS_SUPPORTED_PROVIDERS.join(', ')}`,
      );
    }
    if (updates.activeModel !== undefined && typeof updates.activeModel !== 'string') {
      throw ApiError.badRequest('activeModel must be a string');
    }
    if (updates.estimatedCostPerCallETB !== undefined) {
      const cost = Number(updates.estimatedCostPerCallETB);
      if (Number.isNaN(cost) || cost < 0 || cost > 1000) {
        throw ApiError.badRequest('estimatedCostPerCallETB must be between 0 and 1000');
      }
    }
  },

  reviewEngine: (updates) => {
    if (updates.enabledLanguages !== undefined) {
      if (!Array.isArray(updates.enabledLanguages) || updates.enabledLanguages.length === 0) {
        throw ApiError.badRequest('At least one language must be enabled');
      }
      const invalid = updates.enabledLanguages.filter(
        (l) => !PLATFORM_SETTINGS_SUPPORTED_LANGUAGES.includes(l),
      );
      if (invalid.length > 0) {
        throw ApiError.badRequest(`Unknown languages: ${invalid.join(', ')}`);
      }
    }
    if (updates.globalMaxLinesPerReview !== undefined) {
      const v = Number(updates.globalMaxLinesPerReview);
      if (Number.isNaN(v) || v < 100 || v > 100000) {
        throw ApiError.badRequest('globalMaxLinesPerReview must be between 100 and 100,000');
      }
    }
    if (updates.globalMaxFileSizeBytes !== undefined) {
      const v = Number(updates.globalMaxFileSizeBytes);
      if (Number.isNaN(v) || v < 1024 || v > 104857600) {
        throw ApiError.badRequest('globalMaxFileSizeBytes must be between 1 KB and 100 MB');
      }
    }
  },

  billing: (updates) => {
    if (updates.gracePeriodDays !== undefined) {
      const v = Number(updates.gracePeriodDays);
      if (Number.isNaN(v) || v < 1 || v > 30) {
        throw ApiError.badRequest('gracePeriodDays must be between 1 and 30');
      }
    }
    if (updates.receiptCompanyName !== undefined && typeof updates.receiptCompanyName !== 'string') {
      throw ApiError.badRequest('receiptCompanyName must be a string');
    }
    if (updates.receiptAddress !== undefined && typeof updates.receiptAddress !== 'string') {
      throw ApiError.badRequest('receiptAddress must be a string');
    }
    if (updates.receiptTaxId !== undefined && typeof updates.receiptTaxId !== 'string') {
      throw ApiError.badRequest('receiptTaxId must be a string');
    }
  },
};

const ALLOWED_SECTIONS = Object.keys(VALIDATORS);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the full effective settings (DB values merged with read-only env fields).
 */
export async function getSettings() {
  const doc = await getDoc();

  return {
    general: doc.general,
    access: doc.access,
    ai: doc.ai,
    reviewEngine: doc.reviewEngine,
    billing: doc.billing,
    // Read-only env-sourced fields
    _env: {
      appUrl: process.env.FRONTEND_URL || '',
      apiUrl: process.env.BACKEND_URL || '',
      corsOrigin: process.env.CORS_ORIGIN || '',
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV || 'development',
      appVersion: process.env.APP_VERSION || '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
    },
    _meta: {
      updatedBy: doc.updatedBy || null,
      updatedAt: doc.updatedAt || null,
      version: doc.version || 1,
    },
  };
}

/**
 * Update a single settings section.
 *
 * @param {string} section  One of: general | access | ai | reviewEngine | billing
 * @param {object} updates  Partial fields within that section
 * @param {object} adminUser  The authenticated platform_admin
 */
export async function updateSettings(section, updates, adminUser) {
  if (!ALLOWED_SECTIONS.includes(section)) {
    throw ApiError.badRequest(
      `Unknown section "${section}". Valid sections: ${ALLOWED_SECTIONS.join(', ')}`,
    );
  }

  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw ApiError.badRequest('Updates must be a plain object');
  }

  // Run section-specific validation
  VALIDATORS[section](updates);

  // Load current doc for before snapshot
  const current = await getDoc();
  const before = { ...(current[section] || {}) };

  // Build MongoDB $set for nested fields
  const setOps = {};
  for (const [key, value] of Object.entries(updates)) {
    setOps[`${section}.${key}`] = value;
  }

  const updated = await PlatformSettings.findOneAndUpdate(
    {},
    {
      $set: {
        ...setOps,
        updatedBy: adminUser?._id || null,
      },
      $inc: { version: 1 },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  invalidateCache();

  await writeAuditLog({
    actor: adminUser,
    section,
    before,
    after: updated[section],
  });

  return updated[section];
}

/**
 * Send a test email to the admin's own address to verify Resend is working.
 */
export async function sendTestEmail(adminUser) {
  const recipientEmail = adminUser?.email;
  if (!recipientEmail) {
    throw ApiError.badRequest('Admin user email is required to send a test email');
  }

  const doc = await getDoc();
  const platformName = doc.general?.platformName || 'ReviewX';

  const result = await sendEmail({
    to: recipientEmail,
    subject: `[${platformName}] Test email — settings verification`,
    html: `
      <p>This is a test email sent from the <strong>${platformName}</strong> admin settings panel.</p>
      <p>If you received this, your Resend integration is working correctly.</p>
      <p style="color:#888;font-size:12px;">Sent by: ${adminUser?.email || 'platform admin'}</p>
    `,
    text: `Test email from ${platformName} admin settings. If you received this, Resend is configured correctly.`,
  });

  return {
    sent: result.sent,
    mode: result.mode,
    error: result.error || null,
    recipientEmail,
  };
}

/**
 * Return integration status objects — configured/not, no secrets.
 */
export async function getIntegrationStatuses() {
  const chapaConfigured = Boolean(process.env.CHAPA_SECRET_KEY);
  const chapaMode =
    (process.env.CHAPA_SECRET_KEY || '').startsWith('CHASECK_TEST') ? 'test' : 'live';

  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const emailFrom = process.env.EMAIL_FROM || '';

  const githubConfigured = Boolean(
    process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY,
  );
  const githubCallbackUrl = process.env.GITHUB_REDIRECT_URI || '';

  // GitHub OAuth (used for user-level connections)
  const githubOauthConfigured = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );

  const voxideConfigured = Boolean(process.env.VOXIDE_PUBLIC_KEY);

  const groqConfigured = Boolean(process.env.GROQ_API_KEY);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);

  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY,
  );

  return {
    chapa: {
      configured: chapaConfigured,
      mode: chapaConfigured ? chapaMode : null,
      webhookUrl: process.env.BACKEND_URL
        ? `${process.env.BACKEND_URL}/api/v1/payment/webhook`
        : null,
    },
    resend: {
      configured: resendConfigured,
      from: resendConfigured ? emailFrom : null,
    },
    github: {
      appConfigured: githubConfigured,
      oauthConfigured: githubOauthConfigured,
      callbackUrl: githubCallbackUrl || null,
    },
    voxide: {
      configured: voxideConfigured,
    },
    ai: {
      groq: { configured: groqConfigured },
      openai: { configured: openaiConfigured },
    },
    cloudinary: {
      configured: cloudinaryConfigured,
    },
  };
}
