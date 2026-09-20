
import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeSecurity
} from "../../../../analyzers/security/securityAnalyzer.js";

test(
  "security analyzer detects SQL injection pattern",
  async () => {
    const context = {
      code:
        'const query = "SELECT * FROM users WHERE id = " + id;',
      fileName:
        "test.js",
      fileExtension:
        ".js",
      language:
        "javascript",
      sourceSize:
        60,
      parsed:
        null,
      companyRules:
        []
    };

    const findings =
      await analyzeSecurity(
        context
      );

    assert.ok(
      findings.some(
        (finding) =>
          finding.ruleId ===
          "SEC-SQLI-001"
      )
    );
  }
);

test(
  "security analyzer detects direct password comparison",
  async () => {
    const context = {
      code:
        "return password === storedPassword;",
      fileName:
        "auth.js",
      fileExtension:
        ".js",
      language:
        "javascript",
      sourceSize:
        40,
      parsed:
        null,
      companyRules:
        []
    };

    const findings =
      await analyzeSecurity(
        context
      );

    assert.ok(
      findings.some(
        (finding) =>
          finding.ruleId ===
          "SEC-AUTH-001"
      )
    );
  }
);