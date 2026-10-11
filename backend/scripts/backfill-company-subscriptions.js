/**
 * scripts/backfill-company-subscriptions.js
 *
 * One-time backfill: ensures every Company document has a matching
 * company-scoped Subscription document.
 *
 * Pre-existing companies that existed before the workspace-entitlement
 * system was introduced will not have a company subscription.  This script
 * creates a Free active subscription for each such company so that
 * `getSubscription({ type: 'company', companyId })` never returns the
 * logged warning / Free fallback in production.
 *
 * Usage:
 *   node scripts/backfill-company-subscriptions.js
 *
 * Safe to run multiple times — it is fully idempotent.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ── Inline minimal models (avoids full app boot) ─────────────────────────────

const companySchema = new mongoose.Schema(
  { name: String, slug: String, owner: mongoose.Schema.Types.ObjectId },
  { timestamps: true },
);
const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

const subscriptionSchema = new mongoose.Schema(
  {
    userId:              { type: mongoose.Schema.Types.ObjectId },
    companyId:           { type: mongoose.Schema.Types.ObjectId, index: true },
    plan:                { type: String, default: 'free' },
    status:              { type: String, default: 'active' },
    startedAt:           { type: Date, default: Date.now },
    expiresAt:           { type: Date, default: null },
    trialEndsAt:         { type: Date, default: null },
    monthlyReviews:      { type: Number, default: 50 },
    aiAssistedReviews:   { type: Number, default: 5 },
    linesPerReview:      { type: Number, default: 1000 },
    filesPerReview:      { type: Number, default: 50 },
    historyRetentionDays:{ type: Number, default: 30 },
    seats:               { type: Number, default: 0 },
  },
  { timestamps: true },
);
// Reuse existing model if already registered (re-run safety)
const Subscription =
  mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    'mongodb://127.0.0.1:27017/reviewx';

  console.log(`[backfill] Connecting to ${mongoUri.replace(/:\/\/[^@]+@/, '://****@')} …`);
  await mongoose.connect(mongoUri);
  console.log('[backfill] Connected.\n');

  const companies = await Company.find({}).lean();
  console.log(`[backfill] Found ${companies.length} company document(s).\n`);

  let found = 0;
  let created = 0;
  let skipped = 0;

  for (const company of companies) {
    const existing = await Subscription.findOne({ companyId: company._id }).lean();

    if (existing) {
      found += 1;
      console.log(`  [skip]    ${company.name} (${company._id}) — subscription already exists (plan=${existing.plan})`);
      continue;
    }

    try {
      await Subscription.create({
        userId: company.owner,
        companyId: company._id,
        plan: 'free',
        status: 'active',
        startedAt: new Date(),
        expiresAt: null,
        monthlyReviews: 50,
        aiAssistedReviews: 5,
        linesPerReview: 1000,
        filesPerReview: 50,
        historyRetentionDays: 30,
        seats: 0,
      });
      created += 1;
      console.log(`  [created] ${company.name} (${company._id}) — Free active subscription created`);
    } catch (err) {
      if (err.code === 11000) {
        // Unique index race — another process created it concurrently
        skipped += 1;
        console.log(`  [skip]    ${company.name} (${company._id}) — duplicate (unique index race)`);
      } else {
        console.error(`  [error]   ${company.name} (${company._id}) — ${err.message}`);
      }
    }
  }

  console.log(`
[backfill] Done.
  Existing  : ${found}
  Created   : ${created}
  Skipped   : ${skipped}
  `);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
