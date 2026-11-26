import test from "node:test";
import assert from "node:assert/strict";

import {
  changePasswordSchema,
  registerSchema,
  resetPasswordTokenSchema,
} from "../../validation/auth.validation.js";

const mediumPassword = "Password1";
const strongPassword = "Correct-Horse-42!";
const weakPassword = "password";
const resetToken = "a".repeat(64);

const passwordSchemas = [
  [
    registerSchema,
    (password) => ({
      name: "Ada",
      email: "ada@example.com",
      password,
    }),
  ],
  [
    changePasswordSchema,
    (password) => ({
      newPassword: password,
    }),
  ],
  [
    resetPasswordTokenSchema,
    (password) => ({
      token: resetToken,
      password,
      confirmPassword: password,
    }),
  ],
];

test("registration and password update schemas accept medium and strong passwords", () => {
  for (const [schema, buildValues] of passwordSchemas) {
    assert.equal(schema.validate(buildValues(mediumPassword)).error, undefined);
    assert.equal(schema.validate(buildValues(strongPassword)).error, undefined);
  }
});

test("registration and password update schemas reject weak passwords", () => {
  for (const [schema, buildValues] of passwordSchemas) {
    assert.match(schema.validate(buildValues(weakPassword)).error.message, /weak/i);
  }
});

test("registration and password update schemas require at least eight characters", () => {
  const shortPassword = "Ab1!";

  for (const [schema, buildValues] of passwordSchemas) {
    assert.match(schema.validate(buildValues(shortPassword)).error.message, /8 characters/i);
  }
});
