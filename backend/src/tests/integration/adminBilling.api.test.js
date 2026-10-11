import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import app from "../../app.js";
import { config } from "../../config/env.js";
import { User } from "../../database/models/user.model.js";
import { Subscription } from "../../database/models/subscription.model.js";
import { Payment } from "../../database/models/payment.model.js";
import { AuditLog } from "../../database/models/auditLog.model.js";

async function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function createToken(userId, role) {
  return jwt.sign(
    { userId: userId.toString(), role },
    config.jwtSecret,
    { expiresIn: "1h" },
  );
}

test("Admin Billing API Integration Tests", async (t) => {
  let server;
  let baseUrl;

  let platformAdminUser;
  let memberUser;
  let testCustomerUser;
  let testSubscription;

  let adminToken;
  let memberToken;

  t.before(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 30000 });
    }

    server = await startTestServer();
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/admin/billing`;

    platformAdminUser = await User.create({
      name: "Billing Super Admin",
      passwordHash: "dummyHash123",
      email: `billing_admin_${Date.now()}@test.com`,
      role: "platform_admin",
    });
    adminToken = createToken(platformAdminUser._id, platformAdminUser.role);

    memberUser = await User.create({
      name: "Plain Dev",
      passwordHash: "dummyHash123",
      email: `billing_member_${Date.now()}@test.com`,
      role: "member",
    });
    memberToken = createToken(memberUser._id, memberUser.role);

    testCustomerUser = await User.create({
      name: "Customer Acme",
      passwordHash: "dummyHash123",
      email: `customer_${Date.now()}@acme.com`,
      role: "member",
    });

    testSubscription = await Subscription.create({
      userId: testCustomerUser._id,
      plan: "pro",
      status: "active",
      monthlyReviews: 500,
      aiAssistedReviews: 20,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await Payment.create({
      userId: testCustomerUser._id,
      plan: "pro",
      amount: 500,
      currency: "ETB",
      txRef: `TEST-TX-${Date.now()}`,
      status: "paid",
      verifiedAt: new Date(),
    });
  });

  t.after(async () => {
    if (platformAdminUser) await User.deleteOne({ _id: platformAdminUser._id });
    if (memberUser) await User.deleteOne({ _id: memberUser._id });
    if (testCustomerUser) await User.deleteOne({ _id: testCustomerUser._id });
    if (testSubscription) await Subscription.deleteOne({ _id: testSubscription._id });

    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  await t.test("GET /billing/overview - returns comprehensive KPIs and revenue metrics", async () => {
    const res = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.revenue);
    assert.ok(typeof body.data.revenue.thisMonth === "number");
    assert.ok(Array.isArray(body.data.revenue.trend));
    assert.ok(body.data.mrr);
    assert.ok(typeof body.data.mrr.amount === "number");
    assert.ok(body.data.activeSubscriptions);
    assert.ok(body.data.paymentHealth);
    assert.ok(body.data.conversion);
    assert.ok(body.data.trials);
    assert.ok(body.data.churn);
    assert.ok(body.data.atRisk);
    assert.ok(body.data.planMix);
  });

  await t.test("GET /billing/subscriptions - lists workspaces with usage meters and filters", async () => {
    const res = await fetch(`${baseUrl}/subscriptions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.subscriptions));
    assert.ok(body.data.subscriptions.length > 0);
    const found = body.data.subscriptions.find((s) => s._id === String(testSubscription._id));
    assert.ok(found);
    assert.ok(found.usageMeters);
  });

  await t.test("POST /billing/subscriptions/:id/grant-extend - extends access and logs audit entry", async () => {
    const res = await fetch(`${baseUrl}/subscriptions/${testSubscription._id}/grant-extend`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        days: 14,
        reason: "Customer goodwill extension due to support ticket",
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "active");

    const audit = await AuditLog.findOne({
      resourceId: String(testSubscription._id),
      action: "BILLING_GRANT_EXTEND",
    });
    assert.ok(audit);
    assert.equal(audit.metadata.reason, "Customer goodwill extension due to support ticket");
  });

  await t.test("POST /billing/subscriptions/:id/change-plan - updates plan and limits with audit log", async () => {
    const res = await fetch(`${baseUrl}/subscriptions/${testSubscription._id}/change-plan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetPlan: "team",
        reason: "Enterprise custom contract upgrade approved",
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.plan, "team");
    assert.equal(body.data.monthlyReviews, 5000);
  });

  await t.test("GET /billing/payments - lists payments and reconciliation report", async () => {
    const res = await fetch(`${baseUrl}/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.payments));

    const reconRes = await fetch(`${baseUrl}/payments/reconciliation`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(reconRes.status, 200);
    const reconBody = await reconRes.json();
    assert.equal(reconBody.success, true);
    assert.ok(typeof reconBody.data.mismatchesCount === "number");
  });

  await t.test("GET /billing/plans & PUT /billing/plans/:planId - manages catalogue plans", async () => {
    const listRes = await fetch(`${baseUrl}/plans`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.success, true);
    assert.ok(Array.isArray(listBody.data));
    assert.ok(listBody.data.length >= 4);

    const updateRes = await fetch(`${baseUrl}/plans/pro`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        updates: {
          priceMonthly: 550,
          trialDays: 7,
        },
        reason: "Price adjustment for 2026",
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.success, true);
    assert.equal(updateBody.data.plan.priceMonthly, 550);
  });

  await t.test("GET /billing/usage & GET /billing/audit-logs - returns monitoring data", async () => {
    const usageRes = await fetch(`${baseUrl}/usage`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(usageRes.status, 200);
    const usageBody = await usageRes.json();
    assert.equal(usageBody.success, true);
    assert.ok(Array.isArray(usageBody.data.nearOrOverLimits));
    assert.ok(Array.isArray(usageBody.data.heaviestUsers));
    assert.ok(usageBody.data.aiCostTracker);

    const auditRes = await fetch(`${baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.equal(auditBody.success, true);
    assert.ok(Array.isArray(auditBody.data.logs));
    assert.ok(auditBody.data.logs.length > 0);
  });

  await t.test("Access control: member role is forbidden (403)", async () => {
    const res = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.equal(res.status, 403);
  });
});
