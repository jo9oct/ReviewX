
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";

import {
  createPDFDocument
} from "./templates/pdf.template.js";

export async function generatePDFReport({
  report,
  outputDirectory,
  fileName
}) {
  if (!report) {
    throw new TypeError(
      "Report data is required."
    );
  }

  await fs.promises.mkdir(
    outputDirectory,
    {
      recursive: true
    }
  );

  const safeFileName =
    sanitizeFileName(
      fileName ||
        "code-review-report.pdf"
    );

  const outputPath =
    path.join(
      outputDirectory,
      safeFileName
    );

  const document =
    createPDFDocument(
      report
    );

  const output =
    fs.createWriteStream(
      outputPath
    );

  document.pipe(
    output
  );

  document.end();

  await once(
    output,
    "finish"
  );

  return {
    fileName:
      safeFileName,
    filePath:
      outputPath
  };
}

function sanitizeFileName(
  fileName
) {
  return fileName
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .slice(0, 150);
}