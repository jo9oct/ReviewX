
import test from "node:test";
import assert from "node:assert/strict";

import {
  deduplicateFindings
} from "../../../engine/findingDeduplicator.js";

test(
  "deduplicator removes identical fingerprints",
  () => {
    const findings = [
      {
        fingerprint:
          "same-fingerprint",
        ruleId:
          "TEST-001",
        severity:
          "medium"
      },
      {
        fingerprint:
          "same-fingerprint",
        ruleId:
          "TEST-001",
        severity:
          "medium"
      },
      {
        fingerprint:
          "different",
        ruleId:
          "TEST-002",
        severity:
          "low"
      }
    ];

    const result =
      deduplicateFindings(
        findings
      );

    assert.equal(
      result.length,
      2
    );
  }
);