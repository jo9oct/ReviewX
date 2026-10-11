import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import app from '../../app.js';
import { config } from '../../config/env.js';
import { User } from '../../database/models/user.model.js';
import { PlatformSettings } from '../../database/models/platformSettings.model.js';
import { AuditLog } from '../../database/models/auditLog.model.js';

async function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function createToken(userId, role) {
  return jwt.sign(
    { userId: userId.toString(), role },
    config.jwtSecret,
    { expiresIn: '1h' },
  );
}

test('Platform Settings API Integration Tests', async (t) => {
  let server;
  let baseUrl;
  let adminBaseUrl;

  let platformAdminUser;
  let memberUser;
  let adminToken;
  let memberToken;

  t.before(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 30000 });
    }

    server = await startTestServer();
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1/admin/platform-settings`;
    adminBaseUrl = `http://127.0.0.1:${port}/api/v1/admin`;

    platformAdminUser = await User.create({
      name: 'Settings Admin',
      passwordHash: 'dummyHash123',
      email: `settings_admin_${Date.now()}@test.com`,
      role: 'platform_admin',
    });
    adminToken = createToken(platformAdminUser._id, 'platform_admin');

    memberUser = await User.create({
      name: 'Regular Member',
      passwordHash: 'dummyHash123',
      email: `settings_member_${Date.now()}@test.com`,
      role: 'member',
    });
    memberToken = createToken(memberUser._id, 'member');

    // Clean up any leftover settings doc
    await PlatformSettings.deleteMany({});
  });

  t.after(async () => {
    if (platformAdminUser) await User.deleteOne({ _id: platformAdminUser._id });
    if (memberUser) await User.deleteOne({ _id: memberUser._id });
    await PlatformSettings.deleteMany({});

    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  // ── Test 1: GET returns full effective settings ─────────────────────────────
  await t.test('GET /platform-settings - returns full effective settings with defaults', async () => {
    const res = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const d = body.data;
    assert.ok(d.general);
    assert.ok(d.access);
    assert.ok(d.ai);
    assert.ok(d.reviewEngine);
    assert.ok(d.billing);
    assert.ok(d._env);
    assert.ok(d._meta);

    // Defaults
    assert.equal(d.general.maintenanceMode, false);
    assert.equal(d.access.allowPublicSignup, true);
    assert.equal(d.ai.killSwitch, false);
    assert.ok(Array.isArray(d.reviewEngine.enabledLanguages));
    assert.ok(d.reviewEngine.enabledLanguages.length > 0);
    assert.equal(d.billing.gracePeriodDays, 3);

    // Env fields present, no secrets
    assert.ok(typeof d._env.nodeVersion === 'string');
    assert.equal(d._env.jwtSecret, undefined);
    assert.equal(d._env.mongoUri, undefined);
  });

  // ── Test 2: PUT /general - updates platform name and writes audit log ────────
  await t.test('PUT /platform-settings/general - updates platformName and writes audit log', async () => {
    const res = await fetch(`${baseUrl}/general`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ platformName: 'ReviewX Test Build' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.platformName, 'ReviewX Test Build');

    // Audit log written
    const audit = await AuditLog.findOne({
      action: 'SETTINGS_UPDATE',
      resourceId: 'general',
    }).sort({ createdAt: -1 });
    assert.ok(audit, 'Audit log entry should exist');
    assert.equal(audit.metadata.section, 'general');
    assert.equal(audit.metadata.after.platformName, 'ReviewX Test Build');
  });

  // ── Test 3: PUT /ai - toggles kill switch and validates provider ─────────────
  await t.test('PUT /platform-settings/ai - sets killSwitch and validates activeProvider', async () => {
    // Valid update
    const res = await fetch(`${baseUrl}/ai`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ killSwitch: true, activeProvider: 'groq', activeModel: 'llama-3.3-70b-versatile' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.killSwitch, true);
    assert.equal(body.data.activeProvider, 'groq');

    // Invalid provider
    const badRes = await fetch(`${baseUrl}/ai`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activeProvider: 'anthropic' }),
    });
    assert.equal(badRes.status, 400);
    const badBody = await badRes.json();
    assert.equal(badBody.success, false);

    // Reset
    await fetch(`${baseUrl}/ai`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ killSwitch: false }),
    });
  });

  // ── Test 4: PUT /reviewEngine - rejects empty languages array ────────────────
  await t.test('PUT /platform-settings/reviewEngine - rejects empty languages array', async () => {
    const res = await fetch(`${baseUrl}/reviewEngine`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabledLanguages: [] }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.message.toLowerCase().includes('language'));

    // Valid update
    const validRes = await fetch(`${baseUrl}/reviewEngine`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabledLanguages: ['javascript', 'typescript', 'python'], globalMaxLinesPerReview: 5000 }),
    });
    assert.equal(validRes.status, 200);
    const validBody = await validRes.json();
    assert.deepEqual(validBody.data.enabledLanguages, ['javascript', 'typescript', 'python']);
    assert.equal(validBody.data.globalMaxLinesPerReview, 5000);
  });

  // ── Test 5: PUT /billing - validates grace period range ──────────────────────
  await t.test('PUT /platform-settings/billing - validates gracePeriodDays range', async () => {
    // Out of range
    const badRes = await fetch(`${baseUrl}/billing`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gracePeriodDays: 99 }),
    });
    assert.equal(badRes.status, 400);

    // Valid
    const res = await fetch(`${baseUrl}/billing`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gracePeriodDays: 7,
        receiptCompanyName: 'TestCo Ltd',
        receiptTaxId: 'ETH-12345',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.gracePeriodDays, 7);
    assert.equal(body.data.receiptCompanyName, 'TestCo Ltd');
  });

  // ── Test 6: POST /test-email - returns sent/mode result ──────────────────────
  await t.test('POST /platform-settings/test-email - returns sent result without crashing', async () => {
    const res = await fetch(`${baseUrl}/test-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.sent === 'boolean');
    assert.ok(typeof body.data.mode === 'string');
    assert.ok(body.data.recipientEmail);
  });

  // ── Test 7: GET /integrations - returns status objects without secrets ────────
  await t.test('GET /platform-settings/integrations - returns status objects with no API keys', async () => {
    const res = await fetch(`${baseUrl}/integrations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const d = body.data;
    assert.ok(typeof d.chapa.configured === 'boolean');
    assert.ok(typeof d.resend.configured === 'boolean');
    assert.ok(typeof d.github.oauthConfigured === 'boolean');
    assert.ok(typeof d.voxide.configured === 'boolean');
    assert.ok(typeof d.ai.groq.configured === 'boolean');
    assert.ok(typeof d.cloudinary.configured === 'boolean');

    // Secrets must NOT be present
    const raw = JSON.stringify(d);
    assert.ok(!raw.includes('CHASECK'), 'Chapa secret must not appear');
    assert.ok(!raw.includes('re_'), 'Resend key must not appear');
    assert.ok(!raw.includes('gsk_'), 'Groq key must not appear');
  });

  // ── Test 8: GET /admins - lists platform_admin users ─────────────────────────
  await t.test('GET /admins - lists platform_admin users', async () => {
    const res = await fetch(`${adminBaseUrl}/admins`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.every((u) => u.role === 'platform_admin'));
    assert.ok(body.data.some((u) => u.email === platformAdminUser.email));
    // No passwordHash
    assert.ok(body.data.every((u) => !u.passwordHash));
  });

  // ── Test 9: promote + demote round-trip with audit log ───────────────────────
  await t.test('POST /admins/promote then /demote - role round-trip with audit logs', async () => {
    // Promote member → platform_admin
    const promoteRes = await fetch(`${adminBaseUrl}/admins/promote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: memberUser._id.toString(), reason: 'Test promotion for integration test' }),
    });
    assert.equal(promoteRes.status, 200);
    const promoteBody = await promoteRes.json();
    assert.equal(promoteBody.data.role, 'platform_admin');

    // Audit log for promotion
    const promoteAudit = await AuditLog.findOne({
      action: 'ADMIN_PROMOTE',
      resourceId: memberUser._id.toString(),
    });
    assert.ok(promoteAudit, 'Promotion audit log must exist');
    assert.equal(promoteAudit.metadata.newRole, 'platform_admin');

    // Demote back
    const demoteRes = await fetch(`${adminBaseUrl}/admins/demote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: memberUser._id.toString(), reason: 'Test demotion for integration test' }),
    });
    assert.equal(demoteRes.status, 200);
    const demoteBody = await demoteRes.json();
    assert.equal(demoteBody.data.role, 'member');

    // Audit log for demotion
    const demoteAudit = await AuditLog.findOne({
      action: 'ADMIN_DEMOTE',
      resourceId: memberUser._id.toString(),
    });
    assert.ok(demoteAudit, 'Demotion audit log must exist');
    assert.equal(demoteAudit.metadata.previousRole, 'platform_admin');
  });

  // ── Test 10: access control - member gets 403 ────────────────────────────────
  await t.test('Access control: member role is forbidden (403) on all settings routes', async () => {
    const routes = [
      { method: 'GET',  url: baseUrl },
      { method: 'PUT',  url: `${baseUrl}/general` },
      { method: 'POST', url: `${baseUrl}/test-email` },
      { method: 'GET',  url: `${baseUrl}/integrations` },
      { method: 'GET',  url: `${adminBaseUrl}/admins` },
      { method: 'POST', url: `${adminBaseUrl}/admins/promote` },
    ];

    for (const route of routes) {
      const res = await fetch(route.url, {
        method: route.method,
        headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
        body: route.method !== 'GET' ? '{}' : undefined,
      });
      assert.equal(res.status, 403, `Expected 403 for ${route.method} ${route.url}`);
    }
  });
});
