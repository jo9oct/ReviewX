import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { config } from "../../config/env.js";
import { User } from "../../database/models/user.model.js";

const run = promisify(execFile);

const SCRIPT = new URL("../../../scripts/seed-platform-admin.js", import.meta.url).pathname;

function runSeed(extraEnv = {}) {
  return run(process.execPath, [SCRIPT], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      MONGODB_URI: config.mongoUri,
      PLATFORM_ADMIN_NAME: "Seed Admin",
      PLATFORM_ADMIN_EMAIL: "seed-admin@test.local",
      PLATFORM_ADMIN_PASSWORD: "seed-password-123",
      ...extraEnv,
    },
  });
}

test("Platform admin seed script", async (t) => {
  await mongoose.connect(config.mongoUri);

  t.after(async () => {
    await User.deleteMany({ email: "seed-admin@test.local" });
    await mongoose.disconnect();
  });
  await User.deleteMany({ email: "seed-admin@test.local" });

  await t.test("creates the platform admin", async () => {
    const { stdout } = await runSeed();
    assert.match(stdout, /Created platform admin/);

    const user = await User.findOne({ email: "seed-admin@test.local" }).lean();
    assert.ok(user, "user exists");
    assert.equal(user.role, "platform_admin");
    assert.equal(user.company, null);
    assert.equal(user.isActive, true);
  });

  await t.test("is idempotent — second run changes nothing", async () => {
    const before = await User.findOne({ email: "seed-admin@test.local" }).lean();
    const { stdout } = await runSeed();
    assert.match(stdout, /already a platform admin/);

    const after = await User.findOne({ email: "seed-admin@test.local" }).lean();
    assert.equal(after.role, before.role);
    assert.equal(String(after.updatedAt), String(before.updatedAt));
  });

  await t.test("never overwrites an existing user's password", async () => {
    // Change the password, then re-run the seed: hash must stay untouched.
    const user = await User.findOne({ email: "seed-admin@test.local" });
    await user.setPassword("totally-different-pass-999");
    await user.save();
    const hashBefore = user.passwordHash;

    await runSeed();

    const refreshed = await User.findOne({ email: "seed-admin@test.local" }).select("+passwordHash");
    assert.equal(refreshed.passwordHash, hashBefore);
    assert.equal(await refreshed.verifyPassword("totally-different-pass-999"), true);
  });

  await t.test("refuses to run without an email", async () => {
    await assert.rejects(
      runSeed({ PLATFORM_ADMIN_EMAIL: "" }),
      (err) => {
        assert.notEqual(err.code, 0);
        assert.match(String(err.stderr) + String(err.stdout), /PLATFORM_ADMIN_EMAIL is required/);
        return true;
      }
    );
  });

  await t.test("refuses weak passwords in production", async () => {
    await assert.rejects(
      runSeed({ NODE_ENV: "production", PLATFORM_ADMIN_PASSWORD: "short" }),
      (err) => {
        assert.notEqual(err.code, 0);
        assert.match(String(err.stderr), /at least 8 characters/);
        return true;
      }
    );
  });

  await t.test("a registration can never produce platform_admin", async () => {
    // Belt-and-braces: even a direct model write with a stripped field
    // must not leak through the API — verified via the register schema.
    const { registerSchema } = await import("../../validators/authValidators.js");
    const { value } = registerSchema.validate({
      name: "X Y",
      email: "role-escalation@test.local",
      password: "password123",
      role: "platform_admin",
      accountType: "company_owner",
      companyName: "Evil Inc",
    });
    assert.equal(value.role, undefined, "role must be stripped");
    assert.equal(value.accountType, "company_owner");

    const bad = registerSchema.validate({
      name: "X Y",
      email: "x@y.test",
      password: "password123",
      role: "platform_admin",
      accountType: "platform_admin",
    });
    assert.ok(bad.error, "invalid accountType must fail validation");
  });
});
