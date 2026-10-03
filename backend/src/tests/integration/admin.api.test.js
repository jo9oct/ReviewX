import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import app from "../../app.js";
import { config } from "../../config/env.js";
import { User } from "../../database/models/user.model.js";

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
    baseUrl = `http://127.0.0.1:${server.address().port}/api/admin`;

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

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
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
});
