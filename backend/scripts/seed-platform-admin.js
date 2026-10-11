#!/usr/bin/env node
/**
 * seed-platform-admin.js — idempotently create/ensure the platform admin.
 *
 * Usage:
 *   PLATFORM_ADMIN_NAME="Ada Lovelace" \
 *   PLATFORM_ADMIN_EMAIL="ada@reviewx.io" \
 *   PLATFORM_ADMIN_PASSWORD="..." \
 *   npm run seed:admin
 *
 * Behaviour:
 *   • Never reachable through the API — registration strips `role`.
 *   • If no user exists with the email → creates one (role platform_admin,
 *     company: null, FREE subscription).
 *   • If the user exists with another role → promotes to platform_admin.
 *   • If the user already is platform_admin → no-op (safe to re-run).
 *   • An existing user's password is NEVER changed by this script.
 *   • Fails fast in production when required env vars are missing.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

import { config } from '../src/config/env.js';
import { User } from '../src/database/models/user.model.js';
import { Subscription } from '../src/database/models/subscription.model.js';

function fail(message) {
  console.error(`[seed:admin] ERROR: ${message}`);
  process.exitCode = 1;
}

async function main() {
  const name = (process.env.PLATFORM_ADMIN_NAME ?? '').trim();
  const email = (process.env.PLATFORM_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? '';

  if (!email) {
    fail('PLATFORM_ADMIN_EMAIL is required.');
    return;
  }

  // Production requires an explicit password; development falls back to a
  // clearly-insecure default so local setups still work.
  let effectivePassword = password;
  if (!effectivePassword) {
    if (config.isProd) {
      fail('PLATFORM_ADMIN_PASSWORD is required in production.');
      return;
    }
    effectivePassword = 'dev-platform-admin-change-me';
    console.warn('[seed:admin] No PLATFORM_ADMIN_PASSWORD set — using an insecure development default.');
  } else if (effectivePassword.length < 8) {
    fail('PLATFORM_ADMIN_PASSWORD must be at least 8 characters.');
    return;
  }

  if (!config.mongoUri) {
    fail('MONGODB_URI is not configured.');
    return;
  }

  await mongoose.connect(config.mongoUri);
  console.log('[seed:admin] Connected to MongoDB.');

  try {
    let user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      user = new User({
        name: name || 'Platform Admin',
        email,
        role: 'platform_admin',
        company: null,
        isActive: true,
      });
      await user.setPassword(effectivePassword);
      await user.save();
      console.log(`[seed:admin] Created platform admin: ${email}`);
    } else {
      const changes = [];
      if (user.role !== 'platform_admin') {
        user.role = 'platform_admin';
        changes.push('role → platform_admin');
      }
      if (user.company !== null && user.company !== undefined) {
        user.company = null;
        changes.push('company → null');
      }
      if (!user.isActive) {
        user.isActive = true;
        changes.push('isActive → true');
      }
      if (name && user.name !== name) {
        user.name = name;
        changes.push(`name → ${name}`);
      }

      if (changes.length > 0) {
        await user.save();
        console.log(`[seed:admin] Updated ${email}: ${changes.join(', ')}`);
      } else {
        console.log(`[seed:admin] ${email} is already a platform admin — no changes.`);
      }
      // Password intentionally left untouched on existing accounts.
    }

    // Ensure a subscription exists (consistent with /auth/register).
    const existingSub = await Subscription.findOne({ userId: user._id });
    if (!existingSub) {
      await Subscription.create({
        userId: user._id,
        plan: 'free',
        status: 'active',
      });
      console.log('[seed:admin] Created FREE subscription for platform admin.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('[seed:admin] Done.');
  }
}

main().catch((err) => {
  console.error('[seed:admin] Failed:', err);
  process.exitCode = 1;
});
