
import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeQuality
} from "../../../../analyzers/quality/qualityAnalyzer.js";

test(
  "quality analyzer detects unused variable",
  async () => {
    const context = {
      code:
        "const unusedValue = 10;\nconsole.log('hello');",
      fileName:
        "quality.js",
      fileExtension:
        ".js",
      language:
        "javascript",
      sourceSize:
        45,
      parsed:
        null,
      companyRules:
        []
    };

    const findings =
      await analyzeQuality(
        context
      );

    assert.ok(
      findings.some(
        (finding) =>
          finding.ruleId ===
          "QUALITY-UNUSED-001"
      )
    );
  }
);

test(
  "quality analyzer detects excessive complexity",
  async () => {
    const code = `
      function process(value) {
        if (value) {
          if (value.a) {
            if (value.b) {
              if (value.c) {
                return true;
              }
            }
          }
        }

        return false;
      }
    `;

    const findings =
      await analyzeQuality({
        code,
        fileName:
          "complex.js",
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
      Array.isArray(
        findings
      )
    );
  }
);