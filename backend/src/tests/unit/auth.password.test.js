import test from "node:test";
import assert from "node:assert/strict";

import Auth from "../../database/models/user.model.js";
import { login } from "../../services/auth.service.js";

test("passwordless OAuth accounts reject password login without calling bcrypt with an undefined hash", async () => {
  const user = new Auth({
    name: "GitHub User",
    userName: "githubuser",
    email: "github@example.com",
    githubId: "github-123",
    provider: "github",
  });

  assert.equal(await user.verifyPassword("candidate-password"), false);
  assert.equal(await user.verifyPassword(undefined), false);
});

test("login service returns invalid credentials for passwordless accounts", async () => {
  const user = new Auth({
    name: "GitHub User",
    userName: "githubuser",
    email: "github@example.com",
    githubId: "github-456",
    provider: "github",
  });
  const originalFindOne = Auth.findOne;

  Auth.findOne = () => ({
    select(selection) {
      assert.equal(selection, "+password");
      return Promise.resolve(user);
    },
  });

  try {
    await assert.rejects(
      login({ email: "github@example.com", password: "candidate-password" }),
      /Invalid credentials/,
    );
  } finally {
    Auth.findOne = originalFindOne;
  }
});

test("existing bcrypt password hashes continue to verify", async () => {
  const user = new Auth({
    name: "Local User",
    userName: "localuser",
    email: "local@example.com",
  });
  const password = "ExistingStrongPassword42!";

  await user.setPassword(password);

  assert.equal(await user.verifyPassword(password), true);
  assert.equal(await user.verifyPassword("incorrect-password"), false);
});
