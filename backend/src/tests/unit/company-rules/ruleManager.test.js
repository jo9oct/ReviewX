
import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateCompanyRules
} from "../../../company-rules/ruleManager.js";

test(
  "company rule detects forbidden pattern",
  async () => {
    const context = {
      code:
        "console.log('debug');",
      fileName:
        "test.js",
      fileExtension:
        ".js",
      language:
        "javascript",
      sourceSize:
        22,
      parsed:
        null,
      companyRules: [
        {
          id:
            "NO-CONSOLE",
          title:
            "No console logging",
          description:
            "Console logging is forbidden.",
          type:
            "forbidden-pattern",
          severity:
            "low",
          pattern:
            "console\\.log",
          recommendation:
            "Use the application logger.",
          enabled:
            true,
          required:
            false,
          languages: [
            "javascript"
          ]
        }
      ]
    };

    const findings =
      await evaluateCompanyRules(
        context
      );

    assert.ok(
      findings.some(
        (finding) =>
          finding.ruleId ===
          "COMPANY-NO-CONSOLE"
      )
    );
  }
);