
import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeWithAI
} from "../../../ai/aiManager.js";

test(
  "AI is skipped when access does not allow AI",
  async () => {
    const result =
      await analyzeWithAI({
        context: {
          code:
            "const value = 10;",
          language:
            "javascript",
          fileName:
            "test.js"
        },

        findings: [],

        access: {
          features: {
            ai: false
          },

          limits: {
            maxAiFindings: 0
          }
        }
      });

    assert.equal(
      result.status,
      "not_available"
    );
  }
);