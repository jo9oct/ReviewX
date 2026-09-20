
export function collectEvidence(
  findings = [],
  context
) {
  if (!context?.code) {
    return findings;
  }

  const lines =
    context.code.split("\n");

  return findings.map(
    (finding) => {
      const evidence =
        Array.isArray(
          finding.evidence
        )
          ? finding.evidence
          : [];

      const normalizedEvidence =
        evidence
          .map(
            (item) =>
              normalizeEvidence(
                item,
                lines,
                context.fileName
              )
          )
          .filter(Boolean);

      return {
        ...finding,
        evidence:
          normalizedEvidence
      };
    }
  );
}

function normalizeEvidence(
  evidence,
  lines,
  defaultFile
) {
  if (!evidence) {
    return null;
  }

  const line =
    Number.isInteger(
      evidence.line
    )
      ? evidence.line
      : null;

  let code =
    typeof evidence.code === "string"
      ? evidence.code
      : null;

  if (
    line &&
    line >= 1 &&
    line <= lines.length
  ) {
    code =
      lines[line - 1];
  }

  if (!code) {
    return null;
  }

  return {
    ...evidence,
    file:
      evidence.file ||
      defaultFile,
    line,
    column:
      Number.isInteger(
        evidence.column
      )
        ? evidence.column
        : 1,
    code
  };
}