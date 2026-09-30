const escapePdfText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');

const flattenReportLines = (report) => {
  const lines = [];

  lines.push('AI Code Review Report');
  lines.push(
    `Report Version: ${report?.reportVersion || '1.0'}`,
  );
  lines.push(
    `Generated At: ${report?.generatedAt || ''}`,
  );
  lines.push('');

  lines.push('Review');
  lines.push(
    `ID: ${report?.review?.id || 'N/A'}`,
  );
  lines.push(
    `Status: ${report?.review?.status || 'N/A'}`,
  );
  lines.push('');

  lines.push('Project');
  lines.push(
    `Name: ${report?.project?.name || 'N/A'}`,
  );
  lines.push(
    `Source Type: ${report?.project?.sourceType || 'N/A'}`,
  );
  lines.push('');

  const summary = report?.summary || {};

  lines.push('Summary');
  lines.push(
    `Total Findings: ${summary?.totalFindings ?? 0}`,
  );
  lines.push(
    `Critical: ${summary?.critical ?? 0}`,
  );
  lines.push(
    `High: ${summary?.high ?? 0}`,
  );
  lines.push(
    `Medium: ${summary?.medium ?? 0}`,
  );
  lines.push(
    `Low: ${summary?.low ?? 0}`,
  );
  lines.push(
    `Info: ${summary?.info ?? 0}`,
  );
  lines.push('');

  const score = report?.score || {};

  lines.push('Score');
  lines.push(
    `Overall: ${score?.overall ?? 'N/A'}`,
  );
  lines.push(
    `Security: ${score?.security ?? 'N/A'}`,
  );
  lines.push(
    `Bugs: ${score?.bugs ?? 'N/A'}`,
  );
  lines.push(
    `Quality: ${score?.quality ?? 'N/A'}`,
  );
  lines.push(
    `Performance: ${score?.performance ?? 'N/A'}`,
  );
  lines.push('');

  lines.push('Findings');

  const findings = Array.isArray(
    report?.findings,
  )
    ? report.findings
    : [];

  if (!findings.length) {
    lines.push('No findings.');
  }

  findings.forEach(
    (finding, index) => {
      lines.push(
        `${index + 1}. ${finding?.title || 'Untitled finding'}`,
      );

      lines.push(
        `   Rule: ${finding?.ruleId || 'N/A'}`,
      );

      lines.push(
        `   Severity: ${finding?.severity || 'N/A'}`,
      );

      lines.push(
        `   Confidence: ${finding?.confidence || 'N/A'}`,
      );

      lines.push(
        `   File: ${finding?.filePath || 'N/A'}`,
      );

      lines.push(
        `   Description: ${finding?.description || 'N/A'}`,
      );

      if (finding?.remediation) {
        lines.push(
          `   Remediation: ${finding.remediation}`,
        );
      }

      lines.push('');
    },
  );

  return lines;
};

const buildPdf = (lines) => {
  const pageWidth = 595;
  const pageHeight = 842;

  const marginLeft = 40;
  const startY = 800;
  const lineHeight = 14;

  const maxLinesPerPage = Math.floor(
    (startY - 40) / lineHeight,
  );

  const pages = [];

  for (
    let index = 0;
    index < lines.length;
    index += maxLinesPerPage
  ) {
    pages.push(
      lines.slice(
        index,
        index + maxLinesPerPage,
      ),
    );
  }

  if (!pages.length) {
    pages.push(['AI Code Review Report']);
  }

  const objects = [];
  const pageObjectNumbers = [];
  const contentObjectNumbers = [];

  objects.push(
    '<< /Type /Catalog /Pages 2 0 R >>',
  );

  objects.push(
    '<< /Type /Pages /Kids [] /Count 0 >>',
  );

  const fontObjectNumber = 3;

  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  );

  let nextObjectNumber = 4;

  pages.forEach(() => {
    const pageObjectNumber =
      nextObjectNumber++;

    const contentObjectNumber =
      nextObjectNumber++;

    pageObjectNumbers.push(
      pageObjectNumber,
    );

    contentObjectNumbers.push(
      contentObjectNumber,
    );

    objects[
      pageObjectNumber - 1
    ] = '';

    objects[
      contentObjectNumber - 1
    ] = '';
  });

  pages.forEach((pageLines, pageIndex) => {
    const commands = [
      'BT',
      '/F1 10 Tf',
      `${marginLeft} ${startY} Td`,
    ];

    pageLines.forEach(
      (line, lineIndex) => {
        if (lineIndex > 0) {
          commands.push(
            `0 -${lineHeight} Td`,
          );
        }

        commands.push(
          `(${escapePdfText(line)}) Tj`,
        );
      },
    );

    commands.push('ET');

    const content =
      commands.join('\n');

    const contentObjectNumber =
      contentObjectNumbers[pageIndex];

    objects[
      contentObjectNumber - 1
    ] =
      `<< /Length ${Buffer.byteLength(
        content,
        'utf8',
      )} >>\nstream\n${content}\nendstream`;

    const pageObjectNumber =
      pageObjectNumbers[pageIndex];

    objects[
      pageObjectNumber - 1
    ] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
  });

  const kids = pageObjectNumbers
    .map(
      (number) =>
        `${number} 0 R`,
    )
    .join(' ');

  objects[1] =
    `<< /Type /Pages /Kids [${kids}] /Count ${pageObjectNumbers.length} >>`;

  let pdf =
    '%PDF-1.4\n';

  const offsets = [0];

  objects.forEach(
    (object, index) => {
      const objectNumber =
        index + 1;

      offsets[objectNumber] =
        Buffer.byteLength(
          pdf,
          'utf8',
        );

      pdf +=
        `${objectNumber} 0 obj\n${object}\nendobj\n`;
    },
  );

  const xrefOffset =
    Buffer.byteLength(
      pdf,
      'utf8',
    );

  pdf +=
    `xref\n0 ${objects.length + 1}\n`;

  pdf +=
    '0000000000 65535 f \n';

  for (
    let index = 1;
    index <= objects.length;
    index += 1
  ) {
    pdf +=
      `${String(
        offsets[index],
      ).padStart(10, '0')} 00000 n \n`;
  }

  pdf +=
    `trailer\n<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\n`;

  pdf +=
    `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(
    pdf,
    'utf8',
  );
};

export const generatePdfReport = (
  report,
) => {
  if (
    !report ||
    typeof report !== 'object'
  ) {
    throw new TypeError(
      'Report data is required.',
    );
  }

  const lines =
    flattenReportLines(
      report,
    );

  return buildPdf(lines);
};