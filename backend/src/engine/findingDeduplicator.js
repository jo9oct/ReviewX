
export function deduplicateFindings(
  findings = []
) {
  const seen =
    new Set();

  const result = [];

  for (const finding of findings) {
    if (!finding) {
      continue;
    }

    const fingerprint =
      finding.fingerprint ||
      buildFallbackFingerprint(
        finding
      );

    if (
      seen.has(fingerprint)
    ) {
      continue;
    }

    seen.add(
      fingerprint
    );

    result.push(
      finding
    );
  }

  return result;
}

function buildFallbackFingerprint(
  finding
) {
  return [
    finding.category,
    finding.ruleId,
    finding.type,
    finding.file,
    finding.line,
    finding.column
  ]
    .map(
      (value) =>
        String(
          value ?? ""
        )
          .trim()
          .toLowerCase()
    )
    .join("|");
}