const SCORE_MAX = 100;
const SCORE_MIN = 0;

const CATEGORY_WEIGHTS = Object.freeze({
  security: 0.4,
  bug: 0.25,
  quality: 0.2,
  performance: 0.15
});

const CATEGORY_BASE_SCORE = Object.freeze({
  security: 100,
  bug: 100,
  quality: 100,
  performance: 100
});

const SEVERITY_PENALTIES = Object.freeze({
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0
});

const CONFIDENCE_FACTORS = Object.freeze({
  high: 1,
  medium: 0.75,
  low: 0.5
});

export {
  SCORE_MAX,
  SCORE_MIN,
  CATEGORY_WEIGHTS,
  CATEGORY_BASE_SCORE,
  SEVERITY_PENALTIES,
  CONFIDENCE_FACTORS
};