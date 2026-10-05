const normalizeSource = (
  source,
) => {
  if (
    typeof source === 'string'
  ) {
    return source;
  }

  if (
    source &&
    typeof source === 'object' &&
    typeof source.content ===
      'string'
  ) {
    return source.content;
  }

  return '';
};

const countLines = (
  source,
) => {
  const normalized =
    normalizeSource(source);

  if (!normalized) {
    return 0;
  }

  return normalized.split(
    /\r?\n/u,
  ).length;
};

const countNonEmptyLines = (
  source,
) => {
  const normalized =
    normalizeSource(source);

  if (!normalized) {
    return 0;
  }

  return normalized
    .split(/\r?\n/u)
    .filter(
      (line) =>
        line.trim().length > 0,
    ).length;
};

const countComments = (
  source,
) => {
  const normalized =
    normalizeSource(source);

  if (!normalized) {
    return 0;
  }

  return normalized
    .split(/\r?\n/u)
    .filter((line) => {
      const trimmed =
        line.trim();

      return (
        trimmed.startsWith(
          '//',
        ) ||
        trimmed.startsWith(
          '#',
        ) ||
        trimmed.startsWith(
          '*',
        ) ||
        trimmed.startsWith(
          '/*',
        ) ||
        trimmed.startsWith(
          '*/',
        )
      );
    }).length;
};

const calculateCodeMetrics = (
  source,
) => {
  const normalized =
    normalizeSource(source);

  const lines =
    countLines(normalized);

  const nonEmptyLines =
    countNonEmptyLines(
      normalized,
    );

  const comments =
    countComments(
      normalized,
    );

  const blankLines =
    Math.max(
      0,
      lines - nonEmptyLines,
    );

  const commentRatio =
    nonEmptyLines === 0
      ? 0
      : Number(
          (
            comments /
            nonEmptyLines
          ).toFixed(4),
        );

  return Object.freeze({
    lines,
    nonEmptyLines,
    comments,
    blankLines,
    commentRatio,
    sourceBytes:
      Buffer.byteLength(
        normalized,
        'utf8',
      ),
  });
};

export {
  normalizeSource,
  countLines,
  countNonEmptyLines,
  countComments,
  calculateCodeMetrics,
};