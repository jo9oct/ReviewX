const SEVERITY_PENALTIES = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0
};

export function calculateScore(
  findings = []
) {
  const categories = {
    security: [],
    bugs: [],
    quality: [],
    performance: []
  };

  for (const finding of findings) {
    if (
      categories[finding.category]
    ) {
      categories[
        finding.category
      ].push(finding);
    }
  }

  const security =
    calculateCategoryScore(
      categories.security
    );

  const bugs =
    calculateCategoryScore(
      categories.bugs
    );

  const quality =
    calculateCategoryScore(
      categories.quality
    );

  const performance =
    calculateCategoryScore(
      categories.performance
    );

  const overall =
    Math.round(
      (
        security +
        bugs +
        quality +
        performance
      ) / 4
    );

  return {
    overall,
    security,
    bugs,
    quality,
    performance,
    findingCounts:
      buildCounts(findings)
  };
}

function calculateCategoryScore(
  findings
) {
  if (
    findings.length === 0
  ) {
    return 100;
  }

  let penalty = 0;

  for (const finding of findings) {
    penalty +=
      SEVERITY_PENALTIES[
        finding.severity
      ] || 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      100 - penalty
    )
  );
}

function buildCounts(
  findings
) {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };

  for (const finding of findings) {
    if (
      Object.hasOwn(
        counts,
        finding.severity
      )
    ) {
      counts[
        finding.severity
      ] += 1;
    }
  }

  return counts;
}