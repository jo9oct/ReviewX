
import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  generatePDFReport
} from "../../../reports/pdfReport.js";

test(
  "PDF report creates a PDF file",
  async () => {
    const directory =
      await fs.promises.mkdtemp(
        path.join(
          os.tmpdir(),
          "code-review-test-"
        )
      );

    const result =
      await generatePDFReport({
        report: {
          generatedAt:
            new Date().toISOString(),

          review: {
            id:
              "review-1",
            fileName:
              "test.js",
            language:
              "javascript",
            fileExtension:
              ".js",
            sourceSize:
              20,
            status:
              "completed"
          },

          summary: {
            totalFindings:
              0,
            critical:
              0,
            high:
              0,
            medium:
              0,
            low:
              0,
            info:
              0
          },

          score: {
            overall:
              100,
            security:
              100,
            bugs:
              100,
            quality:
              100,
            performance:
              100
          },

          findings: []
        },

        outputDirectory:
          directory,

        fileName:
          "test-report.pdf"
      });

    const stat =
      await fs.promises.stat(
        result.filePath
      );

    assert.ok(
      stat.size > 0
    );

    const header =
      Buffer.alloc(5);

    const handle =
      await fs.promises.open(
        result.filePath,
        "r"
      );

    await handle.read(
      header,
      0,
      5,
      0
    );

    await handle.close();

    assert.equal(
      header.toString(),
      "%PDF-"
    );

    await fs.promises.rm(
      directory,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }
);