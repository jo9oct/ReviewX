const SEVERITIES = Object.freeze([
  'critical',
  'high',
  'medium',
  'low',
  'info'
]);

const CONFIDENCE_LEVELS = Object.freeze([
  'low',
  'medium',
  'high'
]);

const FINDING_STATUSES = Object.freeze([
  'detected',
  'verified',
  'false_positive',
  'accepted',
  'resolved'
]);

const FINDING_CATEGORIES = Object.freeze([
  'security',
  'bug',
  'quality',
  'performance',
  'architecture',
  'style'
]);

const SEVERITY_WEIGHTS = Object.freeze({
  critical: 10,
  high: 7,
  medium: 4,
  low: 2,
  info: 0
});

const CONFIDENCE_MULTIPLIERS = Object.freeze({
  high: 1,
  medium: 0.75,
  low: 0.5
});

export {
  SEVERITIES,
  CONFIDENCE_LEVELS,
  FINDING_STATUSES,
  FINDING_CATEGORIES,
  SEVERITY_WEIGHTS,
  CONFIDENCE_MULTIPLIERS
};