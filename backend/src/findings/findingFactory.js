import {
  normalizeFinding,
  normalizeFindings
} from './findingNormalizer.js';

import {
  validateFinding
} from './findingValidator.js';

const createFinding = (violation) => {
  const normalized = normalizeFinding(
    violation
  );

  return validateFinding(normalized);
};

const createFindings = (violations) => {
  return normalizeFindings(
    violations
  ).map(validateFinding);
};

const createFindingsFromStaticAnalysis = (
  staticAnalysis
) => {
  if (
    !staticAnalysis ||
    typeof staticAnalysis !== 'object'
  ) {
    throw new TypeError(
      'Static-analysis result must be an object.'
    );
  }

  const violations = [
    ...(staticAnalysis.security || []),
    ...(staticAnalysis.bugs || []),
    ...(staticAnalysis.quality || []),
    ...(staticAnalysis.performance || []),
    ...(staticAnalysis.company || [])
  ];

  return createFindings(violations);
};

export {
  createFinding,
  createFindings,
  createFindingsFromStaticAnalysis
};