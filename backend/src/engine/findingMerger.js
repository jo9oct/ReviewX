
export function mergeFindings(
  findings = []
) {
  const merged = new Map();

  for (const finding of findings) {
    if (!finding) {
      continue;
    }

    const key =
      buildMergeKey(finding);

    const existing =
      merged.get(key);

    if (!existing) {
      merged.set(
        key,
        cloneFinding(finding)
      );

      continue;
    }

    merged.set(
      key,
      mergeFindingPair(
        existing,
        finding
      )
    );
  }

  return Array.from(
    merged.values()
  );
}

function buildMergeKey(
  finding
) {
  return [
    finding.category,
    finding.ruleId,
    finding.file,
    finding.line,
    finding.column
  ]
    .map(normalizeKeyPart)
    .join("|");
}

function mergeFindingPair(
  first,
  second
) {
  const merged = {
    ...first
  };

  merged.description =
    mergeText(
      first.description,
      second.description
    );

  merged.recommendation =
    mergeText(
      first.recommendation,
      second.recommendation
    );

  merged.evidence =
    mergeEvidence(
      first.evidence,
      second.evidence
    );

  merged.confidence =
    highestConfidence(
      first.confidence,
      second.confidence
    );

  merged.severity =
    highestSeverity(
      first.severity,
      second.severity
    );

  merged.analyzer =
    mergeAnalyzers(
      first.analyzer,
      second.analyzer
    );

  return merged;
}

function mergeEvidence(
  first = [],
  second = []
) {
  const combined = [
    ...first,
    ...second
  ];

  const seen = new Set();

  return combined.filter(
    (item) => {
      const key = JSON.stringify(
        item
      );

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

function mergeAnalyzers(
  first,
  second
) {
  const values = [
    first,
    second
  ]
    .flatMap(
      (value) =>
        typeof value === "string"
          ? value.split(",")
          : []
    )
    .map(
      (value) =>
        value.trim()
    )
    .filter(Boolean);

  return [
    ...new Set(values)
  ].join(",");
}

function mergeText(
  first,
  second
) {
  if (!first) {
    return second || "";
  }

  if (!second) {
    return first;
  }

  if (first === second) {
    return first;
  }

  return `${first} ${second}`;
}

function highestSeverity(
  first,
  second
) {
  const order = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };

  return (
    order[second] > order[first]
      ? second
      : first
  );
}

function highestConfidence(
  first,
  second
) {
  const order = {
    high: 3,
    medium: 2,
    low: 1
  };

  return (
    order[second] > order[first]
      ? second
      : first
  );
}

function normalizeKeyPart(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}

function cloneFinding(
  finding
) {
  return {
    ...finding,
    evidence: Array.isArray(
      finding.evidence
    )
      ? [...finding.evidence]
      : []
  };
}