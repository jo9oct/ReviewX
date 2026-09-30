import {
  SEVERITIES,
  CONFIDENCE_LEVELS,
  FINDING_STATUSES,
  FINDING_CATEGORIES
} from './findingConstants.js';

import { normalizeLocation } from './location.js';
import { normalizeEvidence } from './evidence.js';
import { normalizeRemediation } from './remediation.js';

const validateRequiredString = (value, field) => {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
};

const validateFinding = (finding) => {
  if (!finding || typeof finding !== 'object') {
    throw new TypeError('Finding must be an object.');
  }

  validateRequiredString(finding.ruleId, 'ruleId');
  validateRequiredString(finding.category, 'category');
  validateRequiredString(finding.title, 'title');
  validateRequiredString(finding.description, 'description');
  validateRequiredString(finding.filePath, 'filePath');

  if (!FINDING_CATEGORIES.includes(finding.category)) {
    throw new TypeError(
      `Unsupported finding category: ${finding.category}`
    );
  }

  if (!SEVERITIES.includes(finding.severity)) {
    throw new TypeError(
      `Unsupported finding severity: ${finding.severity}`
    );
  }

  if (!CONFIDENCE_LEVELS.includes(finding.confidence)) {
    throw new TypeError(
      `Unsupported finding confidence: ${finding.confidence}`
    );
  }

  if (!FINDING_STATUSES.includes(finding.status)) {
    throw new TypeError(
      `Unsupported finding status: ${finding.status}`
    );
  }

  const location = normalizeLocation(finding.location);
  const evidence = normalizeEvidence(finding.evidence);
  const remediation = normalizeRemediation(
    finding.remediation
  );

  if (!evidence) {
    throw new TypeError(
      'Finding must contain valid source evidence.'
    );
  }

  return {
    ...finding,
    location,
    evidence,
    remediation
  };
};

export {
  validateFinding
};