// STATUS: UPDATED

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const MARGIN_LEFT = 42;
const MARGIN_RIGHT = 42;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 48;

const CONTENT_WIDTH =
  PAGE_WIDTH -
  MARGIN_LEFT -
  MARGIN_RIGHT;

const COLORS = {
  text: '0.12 0.14 0.18',
  muted: '0.42 0.45 0.50',
  heading: '0.08 0.10 0.14',
  border: '0.82 0.84 0.88',
  background: '0.96 0.97 0.98',
  white: '1 1 1',
  critical: '0.75 0.10 0.10',
  high: '0.85 0.32 0.08',
  medium: '0.80 0.58 0.05',
  low: '0.20 0.48 0.72',
  info: '0.35 0.42 0.52',
};

const escapePdfText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');

const normalizeText = (value) =>
  String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const wrapText = (
  value,
  maxCharacters,
) => {
  const text =
    normalizeText(value);

  if (!text) {
    return [''];
  }

  const words =
    text.split(' ');

  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    const candidate =
      `${current} ${word}`;

    if (
      candidate.length <=
      maxCharacters
    ) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const severityColor = (
  severity,
) => {
  switch (
    String(
      severity || '',
    ).toLowerCase()
  ) {
    case 'critical':
      return COLORS.critical;

    case 'high':
      return COLORS.high;

    case 'medium':
      return COLORS.medium;

    case 'low':
      return COLORS.low;

    default:
      return COLORS.info;
  }
};

const addText = (
  commands,
  {
    x,
    y,
    text,
    font = 'F1',
    size = 10,
    color = COLORS.text,
  },
) => {
  commands.push(
    `${color} rg`,
  );

  commands.push(
    `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(
      text,
    )}) Tj ET`,
  );
};

const addLine = (
  commands,
  {
    x1,
    y1,
    x2,
    y2,
    color = COLORS.border,
    width = 0.7,
  },
) => {
  commands.push(
    `${color} RG`,
  );

  commands.push(
    `${width} w`,
  );

  commands.push(
    `${x1} ${y1} m ${x2} ${y2} l S`,
  );
};

const addRectangle = (
  commands,
  {
    x,
    y,
    width,
    height,
    fill = COLORS.background,
    stroke = null,
    strokeWidth = 0.7,
  },
) => {
  if (fill) {
    commands.push(
      `${fill} rg`,
    );
  }

  if (stroke) {
    commands.push(
      `${stroke} RG`,
    );

    commands.push(
      `${strokeWidth} w`,
    );
  }

  commands.push(
    `${x} ${y} ${width} ${height} re ${
      stroke ? 'B' : 'f'
    }`,
  );
};

const createPage = () => ({
  commands: [],
  y:
    PAGE_HEIGHT -
    MARGIN_TOP,
});

const ensureSpace = (
  page,
  requiredHeight,
  pages,
) => {
  if (
    page.y -
      requiredHeight <
    MARGIN_BOTTOM
  ) {
    pages.push(page);
    return createPage();
  }

  return page;
};

const addFooter = (
  page,
  pageNumber,
) => {
  addLine(
    page.commands,
    {
      x1: MARGIN_LEFT,
      y1: 34,
      x2:
        PAGE_WIDTH -
        MARGIN_RIGHT,
      y2: 34,
      color:
        COLORS.border,
      width: 0.5,
    },
  );

  addText(
    page.commands,
    {
      x: MARGIN_LEFT,
      y: 20,
      text:
        'AI Code Review Platform',
      font: 'F1',
      size: 7.5,
      color:
        COLORS.muted,
    },
  );

  addText(
    page.commands,
    {
      x:
        PAGE_WIDTH -
        MARGIN_RIGHT -
        28,
      y: 20,
      text:
        `Page ${pageNumber}`,
      font: 'F1',
      size: 7.5,
      color:
        COLORS.muted,
    },
  );
};

const addSectionTitle = (
  page,
  title,
  pages,
) => {
  page =
    ensureSpace(
      page,
      42,
      pages,
    );

  addText(
    page.commands,
    {
      x: MARGIN_LEFT,
      y: page.y,
      text: title,
      font: 'F2',
      size: 15,
      color:
        COLORS.heading,
    },
  );

  page.y -= 8;

  addLine(
    page.commands,
    {
      x1: MARGIN_LEFT,
      y1: page.y,
      x2:
        PAGE_WIDTH -
        MARGIN_RIGHT,
      y2: page.y,
      color:
        COLORS.border,
      width: 0.8,
    },
  );

  page.y -= 20;

  return page;
};

const addLabelValue = (
  page,
  label,
  value,
  pages,
) => {
  const wrapped =
    wrapText(
      value,
      78,
    );

  page =
    ensureSpace(
      page,
      18 +
        wrapped.length *
          13,
      pages,
    );

  addText(
    page.commands,
    {
      x: MARGIN_LEFT,
      y: page.y,
      text: `${label}:`,
      font: 'F2',
      size: 9,
      color:
        COLORS.heading,
    },
  );

  const labelWidth =
    label.length * 5.2 +
    8;

  wrapped.forEach(
    (line, index) => {
      addText(
        page.commands,
        {
          x:
            MARGIN_LEFT +
            labelWidth,
          y:
            page.y -
            index * 13,
          text: line,
          font: 'F1',
          size: 9,
          color:
            COLORS.text,
        },
      );
    },
  );

  page.y -=
    wrapped.length *
      13 +
    5;

  return page;
};

const addSummaryCard = (
  page,
  summary,
  pages,
) => {
  const values = [
    [
      'Total Findings',
      summary?.totalFindings ??
        0,
    ],
    [
      'Critical',
      summary?.critical ?? 0,
    ],
    [
      'High',
      summary?.high ?? 0,
    ],
    [
      'Medium',
      summary?.medium ?? 0,
    ],
    [
      'Low',
      summary?.low ?? 0,
    ],
    [
      'Info',
      summary?.info ?? 0,
    ],
  ];

  const gap = 8;
  const cardWidth =
    (CONTENT_WIDTH -
      gap * 2) /
    3;

  const cardHeight = 55;

  page =
    ensureSpace(
      page,
      cardHeight + 15,
      pages,
    );

  values.forEach(
    ([label, value], index) => {
      const column =
        index % 3;

      const row =
        Math.floor(index / 3);

      const x =
        MARGIN_LEFT +
        column *
          (cardWidth + gap);

      const y =
        page.y -
        row *
          (cardHeight + gap);

      addRectangle(
        page.commands,
        {
          x,
          y:
            y -
            cardHeight,
          width:
            cardWidth,
          height:
            cardHeight,
          fill:
            COLORS.background,
          stroke:
            COLORS.border,
        },
      );

      addText(
        page.commands,
        {
          x: x + 10,
          y:
            y - 18,
          text:
            String(value),
          font: 'F2',
          size: 18,
          color:
            COLORS.heading,
        },
      );

      addText(
        page.commands,
        {
          x: x + 10,
          y:
            y - 38,
          text: label,
          font: 'F1',
          size: 8,
          color:
            COLORS.muted,
        },
      );
    },
  );

  page.y -=
    cardHeight * 2 +
    gap +
    10;

  return page;
};

const addScoreCard = (
  page,
  score,
  pages,
) => {
  const values = [
    [
      'Overall',
      score?.overall,
    ],
    [
      'Security',
      score?.security,
    ],
    [
      'Bugs',
      score?.bugs,
    ],
    [
      'Quality',
      score?.quality,
    ],
    [
      'Performance',
      score?.performance,
    ],
  ];

  page =
    ensureSpace(
      page,
      62,
      pages,
    );

  const gap = 7;

  const cardWidth =
    (CONTENT_WIDTH -
      gap * 4) /
    5;

  values.forEach(
    ([label, value], index) => {
      const x =
        MARGIN_LEFT +
        index *
          (cardWidth + gap);

      addRectangle(
        page.commands,
        {
          x,
          y:
            page.y - 50,
          width:
            cardWidth,
          height: 50,
          fill:
            COLORS.white,
          stroke:
            COLORS.border,
        },
      );

      addText(
        page.commands,
        {
          x: x + 8,
          y:
            page.y - 19,
          text:
            String(
              value ??
                'N/A',
            ),
          font: 'F2',
          size: 13,
          color:
            COLORS.heading,
        },
      );

      addText(
        page.commands,
        {
          x: x + 8,
          y:
            page.y - 38,
          text: label,
          font: 'F1',
          size: 7.5,
          color:
            COLORS.muted,
        },
      );
    },
  );

  page.y -= 65;

  return page;
};

const addFinding = (
  page,
  finding,
  index,
  pages,
) => {
  const title =
    `${index + 1}. ${
      finding?.title ||
      'Untitled finding'
    }`;

  const description =
    finding?.description ||
    'No description provided.';

  const remediation =
    finding?.remediation ||
    '';

  const descriptionLines =
    wrapText(
      description,
      86,
    );

  const remediationLines =
    remediation
      ? wrapText(
          remediation,
          86,
        )
      : [];

  const height =
    105 +
    descriptionLines.length *
      12 +
    remediationLines.length *
      12;

  page =
    ensureSpace(
      page,
      Math.min(
        height,
        260,
      ),
      pages,
    );

  const startY =
    page.y;

  addRectangle(
    page.commands,
    {
      x: MARGIN_LEFT,
      y:
        startY - height,
      width:
        CONTENT_WIDTH,
      height,
      fill:
        COLORS.white,
      stroke:
        COLORS.border,
    },
  );

  const severity =
    String(
      finding?.severity ||
        'info',
    ).toUpperCase();

  const badgeWidth =
    Math.max(
      48,
      severity.length * 6.5 +
        16,
    );

  addRectangle(
    page.commands,
    {
      x:
        PAGE_WIDTH -
        MARGIN_RIGHT -
        badgeWidth -
        10,
      y:
        startY - 26,
      width:
        badgeWidth,
      height: 16,
      fill:
        severityColor(
          finding?.severity,
        ),
    },
  );

  addText(
    page.commands,
    {
      x:
        PAGE_WIDTH -
        MARGIN_RIGHT -
        badgeWidth -
        2,
      y:
        startY - 20,
      text: severity,
      font: 'F2',
      size: 7,
      color:
        COLORS.white,
    },
  );

  addText(
    page.commands,
    {
      x: MARGIN_LEFT + 10,
      y:
        startY - 21,
      text: title,
      font: 'F2',
      size: 11,
      color:
        COLORS.heading,
    },
  );

  let y =
    startY - 46;

  const metadata = [
    [
      'Rule',
      finding?.ruleId ||
        'N/A',
    ],
    [
      'Confidence',
      finding?.confidence ||
        'N/A',
    ],
    [
      'File',
      finding?.filePath ||
        'N/A',
    ],
  ];

  metadata.forEach(
    ([label, value]) => {
      addText(
        page.commands,
        {
          x:
            MARGIN_LEFT +
            10,
          y,
          text:
            `${label}: ${normalizeText(
              value,
            )}`,
          font: 'F1',
          size: 8,
          color:
            COLORS.muted,
        },
      );

      y -= 13;
    },
  );

  y -= 3;

  addText(
    page.commands,
    {
      x:
        MARGIN_LEFT +
        10,
      y,
      text:
        'Description',
      font: 'F2',
      size: 8.5,
      color:
        COLORS.heading,
    },
  );

  y -= 13;

  descriptionLines.forEach(
    (line) => {
      addText(
        page.commands,
        {
          x:
            MARGIN_LEFT +
            10,
          y,
          text: line,
          font: 'F1',
          size: 8,
          color:
            COLORS.text,
        },
      );

      y -= 12;
    },
  );

  if (
    remediationLines.length
  ) {
    y -= 4;

    addText(
      page.commands,
      {
        x:
          MARGIN_LEFT +
          10,
        y,
        text:
          'Remediation',
        font: 'F2',
        size: 8.5,
        color:
          COLORS.heading,
      },
    );

    y -= 13;

    remediationLines.forEach(
      (line) => {
        addText(
          page.commands,
          {
            x:
              MARGIN_LEFT +
              10,
            y,
            text: line,
            font: 'F1',
            size: 8,
            color:
              COLORS.text,
          },
        );

        y -= 12;
      },
    );
  }

  page.y =
    startY -
    height -
    14;

  return page;
};

const buildPdfPages = (
  report,
) => {
  const pages = [];
  let page =
    createPage();

  addText(
    page.commands,
    {
      x: MARGIN_LEFT,
      y: page.y,
      text:
        'AI CODE REVIEW',
      font: 'F2',
      size: 10,
      color:
        COLORS.muted,
    },
  );

  page.y -= 28;

  addText(
    page.commands,
    {
      x: MARGIN_LEFT,
      y: page.y,
      text:
        'Code Review Report',
      font: 'F2',
      size: 26,
      color:
        COLORS.heading,
    },
  );

  page.y -= 22;

  addText(
    page.commands,
    {
      x: MARGIN_LEFT,
      y: page.y,
      text:
        `Version ${
          report?.reportVersion ||
          '1.0'
        }`,
      font: 'F1',
      size: 9,
      color:
        COLORS.muted,
    },
  );

  page.y -= 18;

  addText(
    page.commands,
    {
      x: MARGIN_LEFT,
      y: page.y,
      text:
        `Generated ${
          report?.generatedAt ||
          'N/A'
        }`,
      font: 'F1',
      size: 8.5,
      color:
        COLORS.muted,
    },
  );

  page.y -= 20;

  addLine(
    page.commands,
    {
      x1: MARGIN_LEFT,
      y1: page.y,
      x2:
        PAGE_WIDTH -
        MARGIN_RIGHT,
      y2: page.y,
      color:
        COLORS.border,
      width: 1,
    },
  );

  page.y -= 25;

  page =
    addSectionTitle(
      page,
      'Review',
      pages,
    );

  page =
    addLabelValue(
      page,
      'Review ID',
      report?.review?.id ||
        'N/A',
      pages,
    );

  page =
    addLabelValue(
      page,
      'Status',
      report?.review?.status ||
        'N/A',
      pages,
    );

  page =
    addSectionTitle(
      page,
      'Project',
      pages,
    );

  page =
    addLabelValue(
      page,
      'Name',
      report?.project?.name ||
        'N/A',
      pages,
    );

  page =
    addLabelValue(
      page,
      'Source Type',
      report?.project?.sourceType ||
        'N/A',
      pages,
    );

  page =
    addSectionTitle(
      page,
      'Summary',
      pages,
    );

  page =
    addSummaryCard(
      page,
      report?.summary || {},
      pages,
    );

  page =
    addSectionTitle(
      page,
      'Score',
      pages,
    );

  page =
    addScoreCard(
      page,
      report?.score || {},
      pages,
    );

  page =
    addSectionTitle(
      page,
      'Findings',
      pages,
    );

  const findings =
    Array.isArray(
      report?.findings,
    )
      ? report.findings
      : [];

  if (!findings.length) {
    page =
      ensureSpace(
        page,
        40,
        pages,
      );

    addText(
      page.commands,
      {
        x: MARGIN_LEFT,
        y: page.y,
        text:
          'No findings were detected.',
        font: 'F1',
        size: 10,
        color:
          COLORS.muted,
      },
    );

    page.y -= 30;
  } else {
    findings.forEach(
      (finding, index) => {
        page =
          addFinding(
            page,
            finding,
            index,
            pages,
          );
      },
    );
  }

  pages.push(page);

  pages.forEach(
    (currentPage, index) => {
      addFooter(
        currentPage,
        index + 1,
      );
    },
  );

  return pages;
};

const buildPdf = (
  pages,
) => {
  const objects = [];

  objects.push(
    '<< /Type /Catalog /Pages 2 0 R >>',
  );

  objects.push(
    '<< /Type /Pages /Kids [] /Count 0 >>',
  );

  const regularFontObject = 3;
  const boldFontObject = 4;

  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  );

  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  );

  let nextObjectNumber = 5;

  const pageObjectNumbers = [];
  const contentObjectNumbers = [];

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

  pages.forEach(
    (page, pageIndex) => {
      const content =
        page.commands.join(
          '\n',
        );

      const contentObjectNumber =
        contentObjectNumbers[
          pageIndex
        ];

      objects[
        contentObjectNumber - 1
      ] =
        `<< /Length ${Buffer.byteLength(
          content,
          'utf8',
        )} >>\nstream\n${content}\nendstream`;

      const pageObjectNumber =
        pageObjectNumbers[
          pageIndex
        ];

      objects[
        pageObjectNumber - 1
      ] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontObject} 0 R /F2 ${boldFontObject} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    },
  );

  const kids =
    pageObjectNumbers
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
    `xref\n0 ${
      objects.length + 1
    }\n`;

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
      ).padStart(
        10,
        '0',
      )} 00000 n \n`;
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

  const pages =
    buildPdfPages(
      report,
    );

  return buildPdf(
    pages,
  );
};