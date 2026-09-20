
import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeFindings
} from "../../../engine/findingMerger.js";

test(
  "finding merger combines equivalent findings",
  () => {
    const findings = [
      {
        category:
          "security",
        ruleId:
          "SEC-001",
        type:
          "test",
        file:
          "test.js",
        line:
          10,
        column:
          5,
        severity:
          "medium",
        confidence:
          "medium",
        description:
          "First description",
        recommendation:
          "First recommendation",
        analyzer:
          "analyzer-a",
        evidence: []
      },
      {
        category:
          "security",
        ruleId:
          "SEC-001",
        type:
          "test",
        file:
          "test.js",
        line:
          10,
        column:
          5,
        severity:
          "high",
        confidence:
          "high",
        description:
          "Second description",
        recommendation:
          "Second recommendation",
        analyzer:
          "analyzer-b",
        evidence: []
      }
    ];

    const result =
      mergeFindings(
        findings
      );

    assert.equal(
      result.length,
      1
    );

    assert.equal(
      result[0].severity,
      "high"
    );
  }
);