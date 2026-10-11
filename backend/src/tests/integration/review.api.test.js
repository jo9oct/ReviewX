import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import app from "../../app.js";
import { config } from "../../config/env.js";
import { User } from "../../database/models/user.model.js";
import { Review } from "../../database/models/review.model.js";
import { Subscription } from "../../database/models/subscription.model.js";
import { reviewEngine } from "../../engine/reviewEngine.js";
import { closeQueues } from "../../queue/queue.factory.js";
import { disconnectRedis } from "../../queue/redis.client.js";

async function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function createToken(userId, role, activeCompanyId = null) {
  const payload = { userId: userId.toString(), role };
  if (activeCompanyId) {
    payload.activeCompanyId = activeCompanyId.toString();
  }
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "1h" });
}

test("Review API route tests", async (t) => {
  let server;
  let baseUrl;

  const companyA = new mongoose.Types.ObjectId();
  const companyB = new mongoose.Types.ObjectId();

  let userA1;
  let userA2;
  let userB;
  let tokenUserA1;
  let tokenUserA2;
  let tokenUserB;

  t.before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    server = await startTestServer();
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/reviews`;

    userA1 = await User.create({
      name: "Developer A1",
      passwordHash: "dummyHash123",
      email: `dev_a1_${Date.now()}@test.com`,
      role: "member",
      company: companyA,
    });
    tokenUserA1 = createToken(userA1._id, userA1.role, companyA);

    userA2 = await User.create({
      name: "Admin A2",
      passwordHash: "dummyHash123",
      email: `admin_a2_${Date.now()}@test.com`,
      role: "company_admin",
      company: companyA,
    });
    tokenUserA2 = createToken(userA2._id, userA2.role, companyA);

    userB = await User.create({
      name: "User Outside",
      passwordHash: "dummyHash123",
      email: `dev_b_${Date.now()}@test.com`,
      role: "member",
      company: companyB,
    });
    tokenUserB = createToken(userB._id, userB.role, companyB);

    // Create active team subscriptions for the companies so reviews pass access middleware
    await Subscription.create({
      userId: userA1._id,
      companyId: companyA,
      plan: "team",
      status: "active",
      monthlyReviews: 1000,
      linesPerReview: 10000,
      filesPerReview: 100,
    });

    await Subscription.create({
      userId: userB._id,
      companyId: companyB,
      plan: "team",
      status: "active",
      monthlyReviews: 1000,
      linesPerReview: 10000,
      filesPerReview: 100,
    });
  });

  t.after(async () => {
    if (userA1) await User.deleteOne({ _id: userA1._id });
    if (userA2) await User.deleteOne({ _id: userA2._id });
    if (userB) await User.deleteOne({ _id: userB._id });
    await Subscription.deleteMany({ companyId: { $in: [companyA, companyB] } });
    await Review.deleteMany({ company: { $in: [companyA, companyB] } });

    await closeQueues().catch(() => {});
    await disconnectRedis().catch(() => {});

    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  await t.test("POST /api/v1/reviews requires authentication", async () => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        connection: "close",
      },
      body: JSON.stringify({
        projectName: "Unauth Project",
        source: {
          type: "paste",
          content: "const a = 1;",
        },
      }),
    });

    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.success, false);
  });

  await t.test("GET /api/v1/reviews without a collection route returns 404 (list lives at /all)", async () => {
    const response = await fetch(`${baseUrl}?limit=10`, {
      headers: { connection: "close" },
    });
    assert.equal(response.status, 404);
  });

  await t.test("GET /api/v1/reviews/all requires authentication", async () => {
    const response = await fetch(`${baseUrl}/all?limit=10`, {
      headers: { connection: "close" },
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.success, false);
  });

  await t.test("GET /api/v1/reviews/metrics requires authentication", async () => {
    const response = await fetch(`${baseUrl}/metrics`, {
      headers: { connection: "close" },
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.success, false);
  });

  await t.test("POST /api/v1/reviews populates company and user fields on Review record", async () => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${tokenUserA1}`,
        connection: "close",
      },
      body: JSON.stringify({
        projectName: "Test Project",
        source: {
          type: "paste",
          content: "const secretKey = 'abcdef';",
        },
      }),
    });

    assert.equal(response.status, 202);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(body.data?.review?.id);

    const createdReview = await Review.findOne({ reviewId: body.data.review.id });
    assert.ok(createdReview);
    assert.equal(String(createdReview.company), String(companyA));
    assert.equal(String(createdReview.user), String(userA1._id));
  });

  await t.test("Teammate in same company can view another member's company review", async () => {
    const sampleReview = await Review.create({
      reviewId: new mongoose.Types.ObjectId(),
      user: userA1._id,
      company: companyA,
      ownerId: userA1._id.toString(),
      status: "completed",
      score: 95,
      fileName: "shared.js",
    });

    // Teammate userA2 views userA1's review
    const responseA2 = await fetch(`${baseUrl}/${sampleReview.reviewId}`, {
      headers: {
        authorization: `Bearer ${tokenUserA2}`,
        connection: "close",
      },
    });
    assert.equal(responseA2.status, 200);
    const bodyA2 = await responseA2.json();
    assert.equal(bodyA2.success, true);

    // Outsider userB attempts to view the review -> Forbidden
    const responseB = await fetch(`${baseUrl}/${sampleReview.reviewId}`, {
      headers: {
        authorization: `Bearer ${tokenUserB}`,
        connection: "close",
      },
    });
    assert.equal(responseB.status, 403);
  });

  await t.test("GET /api/v1/reviews/all returns company reviews when in company workspace", async () => {
    const response = await fetch(`${baseUrl}/all?limit=10`, {
      headers: {
        authorization: `Bearer ${tokenUserA2}`,
        connection: "close",
      },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data?.reviews));
    assert.ok(body.data.reviews.length >= 1);
  });

  await t.test("reviewEngine evaluates dynamic company rules and generates findings", async () => {
    const customRule = {
      id: "no-eval-call",
      name: "No eval() calls",
      description: "Direct eval is forbidden in production code",
      category: "security",
      severity: "critical",
      ruleText: "eval(",
      enabled: true,
    };

    const source = {
      type: "upload",
      files: [
        {
          path: "danger.js",
          content: "const res = eval('2 + 2');",
        },
      ],
    };

    const result = await reviewEngine.run({
      source,
      companyRules: [customRule],
      access: { policy: { companyRules: true } },
    });

    assert.ok(result);
    assert.ok(Array.isArray(result.findings));
    const companyFinding = result.findings.find((f) =>
      f.ruleId?.includes("no-eval-call") || f.description?.includes("eval")
    );
    assert.ok(companyFinding, "Should generate finding for custom company rule");
    assert.equal(companyFinding.severity, "critical");
  });
});
