import {
  SCORE_MAX,
  SCORE_MIN,
  SEVERITY_PENALTIES,
  CONFIDENCE_FACTORS,
  CATEGORY_WEIGHTS,
  CATEGORY_BASE_SCORE
} from './scoreConstants.js';

const clamp = (
  value,
  minimum = SCORE_MIN,
  maximum = SCORE_MAX
) => {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
};

const calculateCategoryScore = (
  findings,
  category
) => {
  const categoryFindings = findings.filter(
    (finding) =>
      finding.category === category
  );

  let penalty = 0;

  for (const finding of categoryFindings) {
    const severityPenalty =
      SEVERITY_PENALTIES[
        finding.severity
      ] || 0;

    const confidenceFactor =
      CONFIDENCE_FACTORS[
        finding.confidence
      ] || 0.5;

    penalty +=
      severityPenalty *
      confidenceFactor;
  }

  return clamp(
    CATEGORY_BASE_SCORE[category] - penalty
  );
};

const calculateOverallScore = (
  categoryScores
) => {
  let weightedScore = 0;
  let totalWeight = 0;

  for (
    const [category, weight]
    of Object.entries(CATEGORY_WEIGHTS)
  ) {
    const score =
      categoryScores[category];

    if (
      typeof score !== 'number' ||
      !Number.isFinite(score)
    ) {
      continue;
    }

    weightedScore += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return SCORE_MAX;
  }

  return clamp(
    weightedScore / totalWeight
  );
};

const roundScore = (value) => {
  return Math.round(
    value * 100
  ) / 100;
};

const calculateScores = (findings) => {
  if (!Array.isArray(findings)) {
    throw new TypeError(
      'Findings must be an array.'
    );
  }

  const categories = Object.keys(
    CATEGORY_WEIGHTS
  );

  const categoryScores = {};

  for (const category of categories) {
    categoryScores[category] =
      roundScore(
        calculateCategoryScore(
          findings,
          category
        )
      );
  }

  const overall = roundScore(
    calculateOverallScore(
      categoryScores
    )
  );

  return {
    overall,
    categories: categoryScores
  };
};

export {
  clamp,
  calculateCategoryScore,
  calculateOverallScore,
  calculateScores
};