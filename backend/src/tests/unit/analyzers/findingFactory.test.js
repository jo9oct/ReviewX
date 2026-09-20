
import test from "node:test";
import assert from "node:assert/strict";

import {
  createFinding
} from "../../../analysis/findingFactory.js";

test(
  "finding factory creates a valid finding",
  () => {
    const finding =
      createFinding({
        category:
          "security",
        type:
          "sql-injection",
        ruleId:
          "SEC-SQLI-001",
        title:
          "Potential SQL injection",
        description:
          "Dynamic SQL construction was detected.",
        severity:
          "high",
        confidence:
          "high",
        status:
          "detected",
        file:
          "test.js",
        line:
          1,
        column:
          1,
        code:
          'db.query("SELECT " + id)',
        evidence: [],
        recommendation:
          "Use parameterized queries.",
        analyzer:
          "sqli"
      });

    assert.equal(
      finding.category,
      "security"
    );

    assert.equal(
      finding.status,
      "detected"
    );

    assert.ok(
      finding.fingerprint
    );
  }
);