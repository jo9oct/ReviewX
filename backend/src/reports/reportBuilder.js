import { buildSummary } from "./summaryBuilder.js";
import { normalizeReport } from "./reportNormalizer.js";
import { generateJsonReport } from "./jsonReport.js";
import { generateHtmlReport } from "./htmlReport.js";
import { generatePdfReport } from "./pdfReport.js";

const SUPPORTED_FORMATS = new Set([
  "json",
  "html",
  "pdf",
]);

const normalizeFormat = (format) =>
  String(format || "json")
    .trim()
    .toLowerCase();

export const buildReport = ({
  format = "json",
  review,
  project,
  findings = [],
  score,
  aiAnalysis = null,
}) => {
  const normalizedFormat =
    normalizeFormat(format);

  if (
    !SUPPORTED_FORMATS.has(
      normalizedFormat,
    )
  ) {
    throw new Error(
      `Unsupported report format: ${normalizedFormat}`,
    );
  }

  const summary =
    buildSummary({
      findings,
      score,
    });

  const report =
    normalizeReport({
      review,
      project,
      findings,
      score,
      aiAnalysis,
      summary,
    });

  let content;

  if (
    normalizedFormat === "html"
  ) {
    content =
      generateHtmlReport(
        report,
      );
  } else if (
    normalizedFormat === "pdf"
  ) {
    content =
      generatePdfReport(
        report,
      );
  } else {
    content =
      generateJsonReport(
        report,
      );
  }

  return {
    format:
      normalizedFormat,

    content,

    report,
  };
};

export const getSupportedReportFormats =
  () =>
    [...SUPPORTED_FORMATS];