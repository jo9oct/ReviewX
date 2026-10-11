import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import app from "../../app.js";
import { config } from "../../config/env.js";
import { User } from "../../database/models/user.model.js";
import { EmailLog } from "../../database/models/emailLog.model.js";
import { closeQueues } from "../../queue/queue.factory.js";
import { disconnectRedis } from "../../queue/redis.client.js";

async function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function createToken(userId, role) {
  return jwt.sign(
    { userId: userId.toString(), role },
    config.jwtSecret,
    { expiresIn: "1h" }
  );
}

test("Admin API Integration Tests", async (t) => {
  let server;
  let baseUrl;

  let platformAdminUser;
  let memberUser;
  let targetUser;

  let adminToken;
  let memberToken;

  t.before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    server = await startTestServer();
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/admin`;

    platformAdminUser = await User.create({
      name: "Super Admin",
      passwordHash: "dummyHash123",
      email: `admin_${Date.now()}@test.com`,
      role: "platform_admin",
    });
    adminToken = createToken(platformAdminUser._id, platformAdminUser.role);

    memberUser = await User.create({
      name: "Regular Dev",
      passwordHash: "dummyHash123",
      email: `member_${Date.now()}@test.com`,
      role: "member",
    });
    memberToken = createToken(memberUser._id, memberUser.role);

    targetUser = await User.create({
      name: "Target User",
      passwordHash: "dummyHash123",
      email: `target_${Date.now()}@test.com`,
      role: "member",
    });
  });

  t.after(async () => {
    if (platformAdminUser) await User.deleteOne({ _id: platformAdminUser._id });
    if (memberUser) await User.deleteOne({ _id: memberUser._id });
    if (targetUser) await User.deleteOne({ _id: targetUser._id });
    await EmailLog.deleteMany({ to: { $regex: '@test.com' } }).catch(() => {});

    await closeQueues().catch(() => {});
    await disconnectRedis().catch(() => {});

    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    // Release the DB connection so the test process can exit.
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  await t.test("GET /api/admin/stats - returns live KPIs and events for platform_admin", async () => {
    const res = await fetch(`${baseUrl}/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.kpis);
    assert.ok(typeof body.data.kpis.totalUsers === "number");
    assert.ok(typeof body.data.kpis.totalReviews === "number");
    assert.ok(Array.isArray(body.data.systemEvents));
    assert.ok(Array.isArray(body.data.activityTrend));
    assert.equal(body.data.activityTrend.length, 6);
    assert.ok(Array.isArray(body.data.topTenants));
  });

  await t.test("GET /api/admin/companies - returns platform tenant companies", async () => {
    const res = await fetch(`${baseUrl}/companies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.companies));
  });

  await t.test("GET /api/admin/users - returns real users list", async () => {
    const res = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.users));
    assert.ok(body.data.total >= 3);
    assert.ok(body.data.users.some((u) => u.email === platformAdminUser.email));
  });

  await t.test("PATCH /api/admin/users/:id/role - updates user role", async () => {
    const res = await fetch(`${baseUrl}/users/${targetUser._id}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: "company_admin" }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.role, "company_admin");
  });

  await t.test("PATCH /api/admin/users/:id/status - toggles user active status", async () => {
    const res = await fetch(`${baseUrl}/users/${targetUser._id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.isActive, false);
  });

  await t.test("Access control: member role is forbidden (403)", async () => {
    const resStats = await fetch(`${baseUrl}/stats`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.equal(resStats.status, 403);

    const resUsers = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.equal(resUsers.status, 403);
  });

  await t.test("GET /admin/queues/summary - returns job counts for all queues", async () => {
    const res = await fetch(`${baseUrl}/queues/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.queues);
    assert.ok(body.data.queues.review);
    assert.ok(body.data.queues.report);
    assert.ok(body.data.queues.cleanup);
    assert.ok(typeof body.data.totalFailed === 'number');
    assert.ok(typeof body.data.totalWaiting === 'number');
  });

  await t.test("GET /admin/queues - returns detailed queue info with failed jobs array", async () => {
    const res = await fetch(`${baseUrl}/queues`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.queues);
    assert.ok(Array.isArray(body.data.queues.review?.failedJobs));
    assert.ok(Array.isArray(body.data.queues.report?.failedJobs));
    assert.ok(Array.isArray(body.data.queues.cleanup?.failedJobs));
  });

  await t.test("GET /admin/reviews - returns paginated platform reviews", async () => {
    const res = await fetch(`${baseUrl}/reviews?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.reviews));
    assert.ok(typeof body.data.total === 'number');
    assert.ok(typeof body.data.page === 'number');
    assert.ok(typeof body.data.totalPages === 'number');
  });

  await t.test("GET /admin/activity - returns paginated audit log entries", async () => {
    const res = await fetch(`${baseUrl}/activity?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.logs));
    assert.ok(typeof body.data.total === 'number');
    assert.ok(typeof body.data.page === 'number');
  });

  await t.test("GET /admin/email-logs - returns paginated email delivery logs", async () => {
    const res = await fetch(`${baseUrl}/email-logs?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.logs));
    assert.ok(typeof body.data.total === 'number');
  });

  await t.test("GET /admin/settings - returns sanitized platform configuration", async () => {
    const res = await fetch(`${baseUrl}/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.application);
    assert.ok(typeof body.data.application.name === 'string');
    assert.ok(typeof body.data.application.uptimeSeconds === 'number');
    assert.ok(body.data.queues);
    assert.ok(body.data.integrations);
    assert.ok(body.data.featureFlags);
    // Ensure secrets are NOT present
    assert.equal(body.data.application.jwtSecret, undefined);
    assert.equal(body.data.application.mongoUri, undefined);
  });

  await t.test("POST /auth/revoke-other-sessions - increments tokenVersion and returns new token", async () => {
    // Use the baseUrl for auth (need to derive it from the server port)
    const authBaseUrl = baseUrl.replace('/api/v1/admin', '/api/v1/auth');
    const res = await fetch(`${authBaseUrl}/revoke-other-sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.token === 'string');
    assert.ok(body.data.user);
    // New token should be different from the old one
    assert.notEqual(body.data.token, adminToken);
  });
});
