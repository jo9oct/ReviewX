import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import app from "../../app.js";
import { config } from "../../config/env.js";
import { User } from "../../database/models/user.model.js";
import { CompanyRule } from "../../database/models/companyRule.model.js";

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

test("Company Rules API integration tests", async (t) => {
  let server;
  let baseUrl;

  const companyA = new mongoose.Types.ObjectId();
  const companyB = new mongoose.Types.ObjectId();

  let adminA;
  let memberA;
  let adminB;

  let tokenAdminA;
  let tokenMemberA;
  let tokenAdminB;

  let createdRuleId;

  t.before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    server = await startTestServer();
    baseUrl = `http://127.0.0.1:${server.address().port}/api/company-rules`;

    // Create test users in DB so authenticate middleware finds them
    adminA = await User.create({
      name: "Admin Company A",
      passwordHash: "dummyHash123",
      email: `adminA_${Date.now()}@test.com`,
      role: "company_admin",
      company: companyA,
    });
    tokenAdminA = createToken(adminA._id, adminA.role);

    memberA = await User.create({
      name: "Member Company A",
      passwordHash: "dummyHash123",
      email: `memberA_${Date.now()}@test.com`,
      role: "member",
      company: companyA,
    });
    tokenMemberA = createToken(memberA._id, memberA.role);

    adminB = await User.create({
      name: "Admin Company B",
      passwordHash: "dummyHash123",
      email: `adminB_${Date.now()}@test.com`,
      role: "company_admin",
      company: companyB,
    });
    tokenAdminB = createToken(adminB._id, adminB.role);
  });

  t.after(async () => {
    if (adminA) await User.deleteOne({ _id: adminA._id });
    if (memberA) await User.deleteOne({ _id: memberA._id });
    if (adminB) await User.deleteOne({ _id: adminB._id });
    await CompanyRule.deleteMany({ company: { $in: [companyA, companyB] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test("POST /api/company-rules - company_admin creates rule", async () => {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdminA}`,
      },
      body: JSON.stringify({
        name: "No Raw SQL",
        category: "security",
        description: "Raw SQL queries are strictly prohibited.",
        ruleText: "query\\(.*\\)",
        severity: "high",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.name, "No Raw SQL");
    assert.equal(body.data.category, "security");
    assert.equal(body.data.severity, "high");
    assert.equal(body.data.enabled, true);
    assert.equal(body.data.company.toString(), companyA.toString());
    createdRuleId = body.data._id;
  });

  await t.test("GET /api/company-rules - returns company rules for member and admin", async () => {
    // Admin A gets rules
    const resAdmin = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert.equal(resAdmin.status, 200);
    const bodyAdmin = await resAdmin.json();
    assert.equal(bodyAdmin.success, true);
    assert.ok(bodyAdmin.data.some((r) => r._id === createdRuleId));

    // Member A can also view rules
    const resMember = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${tokenMemberA}` },
    });
    assert.equal(resMember.status, 200);
    const bodyMember = await resMember.json();
    assert.equal(bodyMember.success, true);
    assert.ok(bodyMember.data.some((r) => r._id === createdRuleId));

    // Filter by category
    const resCat = await fetch(`${baseUrl}?category=security`, {
      headers: { Authorization: `Bearer ${tokenMemberA}` },
    });
    assert.equal(resCat.status, 200);
    const bodyCat = await resCat.json();
    assert.ok(bodyCat.data.every((r) => r.category === "security"));
  });

  await t.test("PUT /api/company-rules/:id - updates rule details", async () => {
    const res = await fetch(`${baseUrl}/${createdRuleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdminA}`,
      },
      body: JSON.stringify({
        name: "No Raw SQL Updated",
        severity: "critical",
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.name, "No Raw SQL Updated");
    assert.equal(body.data.severity, "critical");
  });

  await t.test("PATCH /api/company-rules/:id/toggle - toggles enabled state", async () => {
    const res = await fetch(`${baseUrl}/${createdRuleId}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.enabled, false);

    // Toggle back
    const res2 = await fetch(`${baseUrl}/${createdRuleId}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.data.enabled, true);
  });

  await t.test("Authorization failure: member attempting write operations gets 403", async () => {
    // Create attempt
    const resPost = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMemberA}`,
      },
      body: JSON.stringify({
        name: "Member Rule",
        category: "bug",
        description: "Test description",
        ruleText: "pattern",
        severity: "low",
      }),
    });
    assert.equal(resPost.status, 403);

    // Update attempt
    const resPut = await fetch(`${baseUrl}/${createdRuleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMemberA}`,
      },
      body: JSON.stringify({ name: "Hacked Name" }),
    });
    assert.equal(resPut.status, 403);

    // Toggle attempt
    const resToggle = await fetch(`${baseUrl}/${createdRuleId}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenMemberA}` },
    });
    assert.equal(resToggle.status, 403);

    // Delete attempt
    const resDelete = await fetch(`${baseUrl}/${createdRuleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenMemberA}` },
    });
    assert.equal(resDelete.status, 403);
  });

  await t.test("Cross-company access: admin from company B gets 404 (no 403 leak)", async () => {
    // Update company A rule
    const resPut = await fetch(`${baseUrl}/${createdRuleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdminB}`,
      },
      body: JSON.stringify({ name: "Cross Company Update" }),
    });
    assert.equal(resPut.status, 404);

    // Toggle company A rule
    const resToggle = await fetch(`${baseUrl}/${createdRuleId}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenAdminB}` },
    });
    assert.equal(resToggle.status, 404);

    // Delete company A rule
    const resDelete = await fetch(`${baseUrl}/${createdRuleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenAdminB}` },
    });
    assert.equal(resDelete.status, 404);

    // List rules for company B does not leak company A rule
    const resList = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${tokenAdminB}` },
    });
    assert.equal(resList.status, 200);
    const bodyList = await resList.json();
    assert.equal(bodyList.data.length, 0);
  });

  await t.test("DELETE /api/company-rules/:id - deletes the rule", async () => {
    const res = await fetch(`${baseUrl}/${createdRuleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.deleted, true);

    // Verify it is gone
    const resCheck = await fetch(`${baseUrl}/${createdRuleId}`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert.equal(resCheck.status, 404);
  });
});
