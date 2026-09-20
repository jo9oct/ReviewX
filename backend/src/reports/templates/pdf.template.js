
import PDFDocument from "pdfkit";

export function createPDFDocument(
  report
) {
  const document =
    new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title:
          "Code Review Report",
        Author:
          "Code Review Platform",
        Subject:
          "Static Code Review Report"
      }
    });

  writeHeader(
    document,
    report
  );

  writeReviewInformation(
    document,
    report
  );

  writeSummary(
    document,
    report
  );

  writeScore(
    document,
    report
  );

  writeFindings(
    document,
    report
  );

  writeAIAnalysis(
    document,
    report
  );

  return document;
}

function writeHeader(
  document,
  report
) {
  document
    .fontSize(22)
    .text(
      "Code Review Report",
      {
        align: "center"
      }
    );

  document.moveDown();

  document
    .fontSize(9)
    .text(
      `Generated: ${
        report.generatedAt
      }`,
      {
        align: "center"
      }
    );

  document.moveDown(2);
}

function writeReviewInformation(
  document,
  report
) {
  const review =
    report.review || {};

  document
    .fontSize(15)
    .text(
      "Review Information"
    );

  document.moveDown(0.5);

  writeField(
    document,
    "Review ID",
    review.id
  );

  writeField(
    document,
    "File",
    review.fileName
  );

  writeField(
    document,
    "Language",
    review.language
  );

  writeField(
    document,
    "Extension",
    review.fileExtension
  );

  writeField(
    document,
    "Source Size",
    `${review.sourceSize || 0} bytes`
  );

  document.moveDown();
}

function writeSummary(
  document,
  report
) {
  const summary =
    report.summary || {};

  document
    .fontSize(15)
    .text(
      "Finding Summary"
    );

  document.moveDown(0.5);

  const values = [
    [
      "Total",
      summary.totalFindings
    ],
    [
      "Critical",
      summary.critical
    ],
    [
      "High",
      summary.high
    ],
    [
      "Medium",
      summary.medium
    ],
    [
      "Low",
      summary.low
    ],
    [
      "Info",
      summary.info
    ]
  ];

  for (
    const [label, value]
    of values
  ) {
    writeField(
      document,
      label,
      value
    );
  }

  document.moveDown();
}

function writeScore(
  document,
  report
) {
  const score =
    report.score;

  if (!score) {
    return;
  }

  document
    .fontSize(15)
    .text(
      "Analysis Score"
    );

  document.moveDown(0.5);

  writeField(
    document,
    "Overall",
    score.overall
  );

  writeField(
    document,
    "Security",
    score.security
  );

  writeField(
    document,
    "Bugs",
    score.bugs
  );

  writeField(
    document,
    "Quality",
    score.quality
  );

  writeField(
    document,
    "Performance",
    score.performance
  );

  document.moveDown();
}

function writeFindings(
  document,
  report
) {
  const findings =
    Array.isArray(
      report.findings
    )
      ? report.findings
      : [];

  document
    .fontSize(15)
    .text(
      "Findings"
    );

  document.moveDown();

  if (
    findings.length === 0
  ) {
    document
      .fontSize(10)
      .text(
        "No findings were detected."
      );

    document.moveDown();

    return;
  }

  findings.forEach(
    (finding, index) => {
      if (
        index > 0
      ) {
        document.moveDown();
      }

      document
        .fontSize(12)
        .text(
          `${index + 1}. ${
            finding.title
          }`
        );

      document
        .fontSize(9)
        .text(
          `Severity: ${
            finding.severity
          } | Confidence: ${
            finding.confidence
          }`
        );

      document
        .fontSize(9)
        .text(
          `Rule: ${
            finding.ruleId
          }`
        );

      if (
        finding.file
      ) {
        document.text(
          `Location: ${
            finding.file
          }:${finding.line || 1}:${
            finding.column || 1
          }`
        );
      }

      if (
        finding.description
      ) {
        document.moveDown(0.3);

        document.text(
          `Description: ${
            finding.description
          }`
        );
      }

      if (
        finding.code
      ) {
        document.moveDown(0.3);

        document
          .font("Courier")
          .fontSize(8)
          .text(
            finding.code
          )
          .font("Helvetica");
      }

      if (
        finding.recommendation
      ) {
        document.moveDown(0.3);

        document
          .fontSize(9)
          .text(
            `Recommendation: ${
              finding.recommendation
            }`
          );
      }
    }
  );
}

function writeAIAnalysis(
  document,
  report
) {
  const ai =
    report.aiAnalysis;

  if (!ai) {
    return;
  }

  document.addPage();

  document
    .fontSize(15)
    .text(
      "AI Analysis"
    );

  document.moveDown();

  writeField(
    document,
    "Status",
    ai.status
  );

  writeField(
    document,
    "Provider",
    ai.provider
  );

  writeField(
    document,
    "Model",
    ai.model
  );

  if (ai.summary) {
    document.moveDown();

    document
      .fontSize(10)
      .text(
        ai.summary
      );
  }

  if (
    Array.isArray(
      ai.recommendations
    ) &&
    ai.recommendations.length
  ) {
    document.moveDown();

    document
      .fontSize(11)
      .text(
        "Recommendations"
      );

    document.moveDown(0.5);

    for (
      const recommendation
      of ai.recommendations
    ) {
      document
        .fontSize(9)
        .text(
          `• ${recommendation}`
        );
    }
  }
}

function writeField(
  document,
  label,
  value
) {
  document
    .fontSize(9)
    .text(
      `${label}: ${
        value ?? "N/A"
      }`
    );
}