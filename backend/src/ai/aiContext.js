const truncateText = (
  value,
  maximum
) => {
  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  if (
    value.length <= maximum
  ) {
    return value;
  }

  return `${value.slice(
    0,
    maximum
  )}\n[TRUNCATED]`;
};

const createFindingContext = (
  finding
) => {
  return {
    ruleId:
      finding.ruleId,

    category:
      finding.category,

    title:
      finding.title,

    description:
      finding.description,

    severity:
      finding.severity,

    confidence:
      finding.confidence,

    filePath:
      finding.filePath,

    location:
      finding.location,

    evidence:
      finding.evidence
        ? {
            type:
              finding.evidence.type,

            text:
              truncateText(
                finding.evidence.text,
                3000
              )
          }
        : null
  };
};

const createFileContext = (
  file,
  maxBytes
) => {
  return {
    path:
      file.path,

    language:
      file.language,

    source:
      truncateText(
        file.content,
        maxBytes
      )
  };
};

const createAiContext = ({
  findings,
  files,
  maxFindings,
  maxSourceBytes,
  maxContextBytes
}) => {
  const selectedFindings =
    Array.isArray(findings)
      ? findings
          .slice(0, maxFindings)
          .map(createFindingContext)
      : [];

  let consumedBytes = 0;

  const selectedFiles = [];

  if (Array.isArray(files)) {
    for (const file of files) {
      if (
        consumedBytes >=
        maxContextBytes
      ) {
        break;
      }

      const remaining =
        maxContextBytes -
        consumedBytes;

      const limit =
        Math.min(
          maxSourceBytes,
          remaining
        );

      const normalized =
        createFileContext(
          file,
          limit
        );

      consumedBytes +=
        normalized.source.length;

      selectedFiles.push(
        normalized
      );
    }
  }

  return {
    findings:
      selectedFindings,

    files:
      selectedFiles,

    sourceBytes:
      consumedBytes,

    findingCount:
      selectedFindings.length
  };
};

export {
  truncateText,
  createFindingContext,
  createFileContext,
  createAiContext
};