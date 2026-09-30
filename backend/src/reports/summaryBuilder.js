const countBy = (items, property) =>
  items.reduce((counts, item) => {
    const value = item?.[property];

    if (!value) {
      return counts;
    }

    counts[value] = (counts[value] || 0) + 1;

    return counts;
  }, {});

const normalizeScore = (score) => {
  if (!score || typeof score !== "object") {
    return null;
  }

  return {
    overall: score.overall ?? null,
    categories: score.categories || {},
    counts: score.counts || {},
  };
};

export const buildSummary = ({ findings = [], score = null }) => {
  const normalizedFindings = Array.isArray(findings)
    ? findings
    : [];

  const severityCounts = countBy(
    normalizedFindings,
    "severity",
  );

  const categoryCounts = countBy(
    normalizedFindings,
    "category",
  );

  const confidenceCounts = countBy(
    normalizedFindings,
    "confidence",
  );

  return {
    totalFindings: normalizedFindings.length,
    severityCounts,
    categoryCounts,
    confidenceCounts,
    score: normalizeScore(score),
  };
};