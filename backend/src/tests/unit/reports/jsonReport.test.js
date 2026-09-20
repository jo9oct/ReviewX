
import test from "node:test";
import assert from "node:assert/strict";

import {
  generateJSONReport
} from "../../../reports/jsonReport.js";

test(
  "JSON report is valid JSON",
  () => {
    const report = {
      reportVersion:
        "1.0",
      review: {
        id:
          "review-1"
      },
      findings: []
    };

    const output =
      generateJSONReport(
        report
      );

    const parsed =
      JSON.parse(
        output
      );

    assert.equal(
      parsed.reportVersion,
      "1.0"
    );

    assert.equal(
      parsed.review.id,
      "review-1"
    );
  }
);