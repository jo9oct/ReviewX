const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderFinding = (finding, index) => `
<section class="finding">
  <h3>${escapeHtml(index + 1)}. ${escapeHtml(finding.title)}</h3>

  <dl>
    <dt>Rule</dt>
    <dd>${escapeHtml(finding.ruleId)}</dd>

    <dt>Category</dt>
    <dd>${escapeHtml(finding.category)}</dd>

    <dt>Severity</dt>
    <dd>${escapeHtml(finding.severity)}</dd>

    <dt>Confidence</dt>
    <dd>${escapeHtml(finding.confidence)}</dd>

    <dt>Status</dt>
    <dd>${escapeHtml(finding.status)}</dd>

    <dt>File</dt>
    <dd>${escapeHtml(finding.filePath)}</dd>
  </dl>

  <h4>Description</h4>
  <p>${escapeHtml(finding.description)}</p>

  ${
    finding.evidence
      ? `
        <h4>Evidence</h4>
        <pre>${escapeHtml(
          typeof finding.evidence === "string"
            ? finding.evidence
            : finding.evidence.text,
        )}</pre>
      `
      : ""
  }

  ${
    finding.remediation
      ? `
        <h4>Remediation</h4>
        <p>${escapeHtml(
          typeof finding.remediation === "string"
            ? finding.remediation
            : finding.remediation.description,
        )}</p>
      `
      : ""
  }
</section>
`;

export const generateHtmlReport = (report) => {
  if (!report || typeof report !== "object") {
    throw new TypeError("A valid report object is required.");
  }

  const findings = Array.isArray(report.findings)
    ? report.findings
    : [];

  const overallScore = report.score?.overall ?? "N/A";

  const findingsHtml = findings.length
    ? findings
        .map((finding, index) =>
          renderFinding(finding, index),
        )
        .join("")
    : "<p>No findings were recorded.</p>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>Code Review Report</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 32px;
      background: #f5f5f5;
      color: #222;
    }

    main {
      max-width: 1100px;
      margin: 0 auto;
    }

    header,
    .summary,
    .finding {
      background: #ffffff;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 20px;
    }

    h1,
    h2,
    h3,
    h4 {
      margin-top: 0;
    }

    .score {
      font-size: 32px;
      font-weight: bold;
    }

    .finding {
      border-left: 4px solid #555;
    }

    dl {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 8px;
    }

    dt {
      font-weight: bold;
    }

    dd {
      margin: 0;
    }

    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #f1f1f1;
      padding: 16px;
      border-radius: 6px;
    }
  </style>
</head>

<body>
  <main>
    <header>
      <h1>AI Code Review Report</h1>
      <p>
        Review ID:
        ${escapeHtml(report.review?.id)}
      </p>
      <p>
        Generated:
        ${escapeHtml(report.generatedAt)}
      </p>
    </header>

    <section class="summary">
      <h2>Summary</h2>

      <p>
        Project:
        ${escapeHtml(report.project?.name)}
      </p>

      <p>
        Source type:
        ${escapeHtml(report.project?.sourceType)}
      </p>

      <p>
        Findings:
        ${escapeHtml(report.summary?.totalFindings ?? 0)}
      </p>

      <p class="score">
        Score:
        ${escapeHtml(overallScore)}
      </p>
    </section>

    <section>
      <h2>Findings</h2>
      ${findingsHtml}
    </section>
  </main>
</body>
</html>`;
};