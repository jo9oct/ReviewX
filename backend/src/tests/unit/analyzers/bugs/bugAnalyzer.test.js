
import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeBugs
} from "../../../../analyzers/bugs/bugAnalyzer.js";

test(
  "bug analyzer detects assignment in conditional",
  async () => {
    const context = {
      code:
        "if (value = 10) { return true; }",
      fileName:
        "logic.js",
      fileExtension:
        ".js",
      language:
        "javascript",
      sourceSize:
        35,
      parsed:
        null,
      companyRules:
        []
    };

    const findings =
      await analyzeBugs(
        context
      );

    assert.ok(
      findings.some(
        (finding) =>
          finding.ruleId ===
          "BUG-LOGIC-001"
      )
    );
  }
);

test(
  "bug analyzer returns an array",
  async () => {
    const context = {
      code:
        "const value = 10;",
      fileName:
        "clean.js",
      fileExtension:
        ".js",
      language:
        "javascript",
      sourceSize:
        18,
      parsed:
        null,
      companyRules:
        []
    };

    const findings =
      await analyzeBugs(
        context
      );

    assert.ok(
      Array.isArray(
        findings
      )
    );
  }
);