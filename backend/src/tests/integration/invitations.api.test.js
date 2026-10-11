import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import app from "../../app.js";
import { config } from "../../config/env.js";
import { User } from "../../database/models/user.model.js";
import { Company } from "../../database/models/company.model.js";
import { Invitation } from "../../database/models/invitation.model.js";
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

const TEST_EMAILS = [
  "indy@example.com",
  "sneaky@example.com",
  "olive@acme.test",
  "noco@example.com",
  "newbie@example.com",
  "owner@beta.test",
  "ghost@example.com",
  "revoked@example.com",
  "late@example.com",
];

// Only remove this suite's own fixtures — other test files run in parallel
// processes against the same database and must not be wiped.
async function cleanup() {
  await User.deleteMany({ email: { $in: TEST_EMAILS } });
  await Company.deleteMany({ name: { $in: ["Acme Inc", "Beta LLC"] } });
  await Invitation.deleteMany({ email: { $in: TEST_EMAILS } });
}

test("Auth roles & invitation flow", { timeout: 120000 }, async (t) => {
  const server = await startTestServer();
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongoUri);
  }

  t.after(async () => {
    await cleanup();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    // Invitation flows fire notification triggers, which enqueue delivery
    // jobs onto Redis. Close those handles so the test process can exit.
    await closeQueues().catch(() => {});
    await disconnectRedis().catch(() => {});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  await cleanup();

  // ── Registration ──────────────────────────────────────────────────────────

  await t.test("individual signup creates a plain member", async () => {
    const res = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Indy Vidual",
        email: "indy@example.com",
        password: "password123",
        accountType: "individual",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.user.role, "member");
    assert.equal(body.data.user.company, null);
  });

  await t.test("role field is stripped — cannot register as platform_admin", async () => {
    const res = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sneaky Admin",
        email: "sneaky@example.com",
        password: "password123",
        role: "platform_admin",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.user.role, "member");

    const dbUser = await User.findOne({ email: "sneaky@example.com" }).lean();
    assert.equal(dbUser.role, "member");
  });

  await t.test("company_owner signup creates company + company_admin", async () => {
    const res = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Olive Owner",
        email: "olive@acme.test",
        password: "password123",
        accountType: "company_owner",
        companyName: "Acme Inc",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.user.role, "company_admin");
    assert.ok(body.data.user.company, "owner must be linked to a company");

    const company = await Company.findOne({ name: "Acme Inc" }).lean();
    assert.ok(company, "Company document must exist");
    assert.equal(company.slug, "acme-inc");
  });

  await t.test("company_owner without companyName is rejected", async () => {
    const res = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "No Company",
        email: "noco@example.com",
        password: "password123",
        accountType: "company_owner",
      }),
    });
    assert.equal(res.status, 422);
  });

  // ── Invitations ───────────────────────────────────────────────────────────

  const owner = await User.findOne({ email: "olive@acme.test" });
  const ownerToken = createToken(owner._id, "company_admin");
  const memberToken = createToken(
    (await User.findOne({ email: "indy@example.com" }))._id,
    "member"
  );

  async function createInvite(email, token = ownerToken) {
    const res = await fetch(`${base}/company/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });
    return res;
  }

  /** Extract the raw token from the invite URL returned by the API. */
  function tokenFrom(result) {
    const url = new URL(result.inviteUrl);
    return url.pathname.split("/").pop();
  }

  await t.test("members cannot create invitations (403)", async () => {
    const res = await createInvite("victim@example.com", memberToken);
    assert.equal(res.status, 403);
  });

  let inviteResult;
  let inviteToken;

  await t.test("company_admin creates an invitation and gets an invite URL", async () => {
    const res = await createInvite("newbie@example.com");
    assert.equal(res.status, 201);
    const body = await res.json();
    inviteResult = body.data;
    assert.equal(inviteResult.invitation.email, "newbie@example.com");
    assert.equal(inviteResult.invitation.status, "pending");
    assert.ok(inviteResult.inviteUrl.includes("/invite/"));
    inviteToken = tokenFrom(inviteResult);
    assert.ok(inviteToken.length >= 20);

    // Raw token must not be persisted — only its hash.
    const stored = await Invitation.findOne({ email: "newbie@example.com" }).lean();
    assert.ok(stored.tokenHash);
    assert.notEqual(stored.tokenHash, inviteToken);
    assert.equal(
      stored.tokenHash,
      crypto.createHash("sha256").update(inviteToken).digest("hex")
    );
  });

  await t.test("public preview returns masked email + company name", async () => {
    const res = await fetch(`${base}/invitations/${inviteToken}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.email, "n***@example.com");
    assert.equal(body.data.companyName, "Acme Inc");
    assert.equal(body.data.accountExists, false);
  });

  await t.test("preview with a bogus token returns 404", async () => {
    const res = await fetch(`${base}/invitations/not-a-real-token-1234567890`);
    assert.equal(res.status, 404);
  });

  await t.test("accepting as a new user creates account + logs in", async () => {
    const res = await fetch(`${base}/invitations/${inviteToken}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Bee", password: "password123" }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.token, "must return a JWT");
    assert.equal(body.data.user.role, "member");
    assert.ok(body.data.user.company, "user attached to company");

    const dbUser = await User.findOne({ email: "newbie@example.com" }).lean();
    assert.equal(dbUser.role, "member");
    assert.equal(
      dbUser.company.toString(),
      body.data.user.company.toString()
    );
  });

  await t.test("reusing the same token is rejected (single-use)", async () => {
    const res = await fetch(`${base}/invitations/${inviteToken}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Again", password: "password123" }),
    });
    assert.equal(res.status, 409);
  });

  // ── Existing-account branch ──────────────────────────────────────────────

  let existingInviteToken;

  await t.test("inviting an existing user's email", async () => {
    const res = await createInvite("indy@example.com");
    assert.equal(res.status, 201);
    const body = await res.json();
    existingInviteToken = tokenFrom(body.data);
  });

  await t.test("preview flags accountExists for existing emails", async () => {
    const res = await fetch(`${base}/invitations/${existingInviteToken}`);
    const body = await res.json();
    assert.equal(body.data.accountExists, true);
  });

  await t.test("accept without a session → 401 LOGIN_REQUIRED", async () => {
    const res = await fetch(`${base}/invitations/${existingInviteToken}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "LOGIN_REQUIRED");
  });

  await t.test("accept logged in as a different user → 401 EMAIL_MISMATCH", async () => {
    const ownerJwt = createToken(owner._id, "company_admin");
    const res = await fetch(`${base}/invitations/${existingInviteToken}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerJwt}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "EMAIL_MISMATCH");
  });

  await t.test("accept as the invited user attaches them to the company", async () => {
    const indy = await User.findOne({ email: "indy@example.com" });
    const indyJwt = createToken(indy._id, "member");
    const res = await fetch(`${base}/invitations/${existingInviteToken}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${indyJwt}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.token);

    const dbUser = await User.findOne({ email: "indy@example.com" }).lean();
    assert.ok(dbUser.company, "indie attached to Acme Inc");
  });

  // ── Cross-company guard ──────────────────────────────────────────────────

  await t.test("user in another company gets 409 on accept", async () => {
    // Second company + owner.
    const res2 = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Second Owner",
        email: "owner@beta.test",
        password: "password123",
        accountType: "company_owner",
        companyName: "Beta LLC",
      }),
    });
    assert.equal(res2.status, 201);
    const betaOwner = await User.findOne({ email: "owner@beta.test" });
    const betaToken = createToken(betaOwner._id, "company_admin");

    // Invite indy (already in Acme) from Beta.
    const inviteRes = await fetch(`${base}/company/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({ email: "indy@example.com" }),
    });
    assert.equal(inviteRes.status, 201);
    const inviteBody = await inviteRes.json();
    const betaInviteToken = tokenFrom(inviteBody.data);

    const indyUser = await User.findOne({ email: "indy@example.com" });
    const indyJwt = createToken(indyUser._id, "member");
    const acceptRes = await fetch(`${base}/invitations/${betaInviteToken}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${indyJwt}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(acceptRes.status, 409);
  });

  // ── Revocation & expiry ──────────────────────────────────────────────────

  let revokeId;

  await t.test("admin can list and revoke a pending invitation", async () => {
    const inviteRes = await createInvite("ghost@example.com");
    const inviteBody = await inviteRes.json();
    revokeId = inviteBody.data.invitation.id ?? inviteBody.data.invitation._id;

    const listRes = await fetch(`${base}/company/invitations`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    const target = listBody.data.find(
      (i) => i.email === "ghost@example.com"
    );
    assert.ok(target, "pending invitation listed");
    assert.ok(!("tokenHash" in target), "tokenHash never exposed");

    const delRes = await fetch(`${base}/company/invitations/${revokeId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(delRes.status, 200);
  });

  await t.test("revoked invitation cannot be previewed or accepted", async () => {
    const inviteRes = await createInvite("revoked@example.com");
    const body = await inviteRes.json();
    const token = tokenFrom(body.data);
    const id = body.data.invitation.id ?? body.data.invitation._id;

    await fetch(`${base}/company/invitations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    const preview = await fetch(`${base}/invitations/${token}`);
    assert.equal(preview.status, 409);

    const accept = await fetch(`${base}/invitations/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ghost", password: "password123" }),
    });
    assert.equal(accept.status, 409);
  });

  await t.test("expired invitation is rejected", async () => {
    const inviteRes = await createInvite("late@example.com");
    const body = await inviteRes.json();
    const token = tokenFrom(body.data);

    await Invitation.updateOne(
      { email: "late@example.com" },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    const preview = await fetch(`${base}/invitations/${token}`);
    assert.equal(preview.status, 409);
    const previewBody = await preview.json();
    assert.match(previewBody.error.message, /expired/i);
  });
});
