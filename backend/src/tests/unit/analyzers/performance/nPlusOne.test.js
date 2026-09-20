
import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeNPlusOne
} from "../../../../analyzers/performance/nPlusOne.analyzer.js";

test(
  "N+1 analyzer detects database query inside loop",
  async () => {
    const code = `
      for (const user of users) {
        await db.users.findOne({
          id: user.id
        });
      }
    `;

    const findings =
      await analyzeNPlusOne({
        code,
        fileName:
          "users.js",
        fileExtension:
          ".js",
        language:
          "javascript",
        sourceSize:
          code.length,
        parsed:
          null,
        companyRules:
          []
      });

    assert.ok(
      findings.some(
        (finding) =>
          finding.ruleId ===
          "PERF-N1-001"
      )
    );
  }
);