
import test from "node:test";
import assert from "node:assert/strict";

import {
  createReviewContext
} from "../../engine/reviewContext.js";

import {
  runReview
} from "../../engine/reviewEngine.js";

test(
  "complete deterministic review pipeline works",
  async () => {
    const code = `
      async function getUser(id) {
        const query =
          "SELECT * FROM users WHERE id = " + id;

        return db.query(query);
      }
    `;

    const context =
      createReviewContext({
        code,
        fileName:
          "test.js",
        fileExtension:
          ".js",
        language:
          "javascript",
        sourceSize:
          Buffer.byteLength(
            code,
            "utf8"
          ),
        parsed:
          null,
        companyRules:
          []
      });

    const access = {
      features: {
        ai: false,
        pdf: false
      },

      limits: {
        maxAiFindings:
          0,
        maxSourceSize:
          2_000_000
      }
    };

    const result =
      await runReview(
        context,
        access
      );

    assert.ok(
      result
    );

    assert.ok(
      Array.isArray(
        result.findings
      )
    );

    assert.ok(
      result.score
    );

    assert.ok(
      result.summary
    );

    assert.ok(
      result.findings.some(
        (finding) =>
          finding.ruleId ===
          "SEC-SQLI-001"
      )
    );
  }
);