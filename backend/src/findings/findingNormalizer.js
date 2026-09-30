import {
  FINDING_STATUSES
} from './findingConstants.js';

import {
  normalizeLocation
} from './location.js';

import {
  normalizeEvidence
} from './evidence.js';

import {
  normalizeRemediation
} from './remediation.js';

const CATEGORY_TITLES = Object.freeze({
  security: 'Security Issue',
  bug: 'Potential Bug',
  quality: 'Code Quality Issue',
  performance: 'Performance Issue',
  architecture: 'Architecture Issue',
  style: 'Style Issue'
});

const normalizeCategory = (category) => {
  if (
    typeof category !== 'string' ||
    category.trim().length === 0
  ) {
    return 'quality';
  }

  return category.trim().toLowerCase();
};

const normalizeTitle = (violation) => {
  if (
    typeof violation.ruleName === 'string' &&
    violation.ruleName.trim()
  ) {
    return violation.ruleName.trim();
  }

  const category = normalizeCategory(
    violation.category
  );

  return CATEGORY_TITLES[category] || 'Code Review Finding';
};

const normalizeFinding = (violation) => {
  if (!violation || typeof violation !== 'object') {
    throw new TypeError(
      'Static-analysis violation must be an object.'
    );
  }

  if (
    typeof violation.ruleId !== 'string' ||
    violation.ruleId.trim().length === 0
  ) {
    throw new TypeError(
      'Static-analysis violation requires a ruleId.'
    );
  }

  if (
    typeof violation.filePath !== 'string' ||
    violation.filePath.trim().length === 0
  ) {
    throw new TypeError(
      'Static-analysis violation requires a filePath.'
    );
  }

  const evidence = normalizeEvidence(
    violation.evidence
  );

  if (!evidence) {
    throw new TypeError(
      `Rule ${violation.ruleId} did not provide valid evidence.`
    );
  }

  return {
    ruleId: violation.ruleId,
    category: normalizeCategory(violation.category),
    title: normalizeTitle(violation),
    description:
      typeof violation.description === 'string'
        ? violation.description.trim()
        : typeof violation.message === 'string'
          ? violation.message.trim()
          : 'Static analysis identified a potential issue.',
    severity: violation.severity,
    confidence: violation.confidence,
    status: FINDING_STATUSES[0],
    filePath: violation.filePath,
    location: normalizeLocation(
      violation.location
    ),
    evidence,
    remediation: normalizeRemediation(
      violation.remediation
    ),
    metadata:
      violation.metadata &&
      typeof violation.metadata === 'object'
        ? violation.metadata
        : {}
  };
};

const normalizeFindings = (violations) => {
  if (!Array.isArray(violations)) {
    throw new TypeError(
      'Static-analysis violations must be an array.'
    );
  }

  return violations.map(normalizeFinding);
};

export {
  normalizeFinding,
  normalizeFindings
};