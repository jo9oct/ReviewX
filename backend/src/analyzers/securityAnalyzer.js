const normalizeViolations = (
  violations = [],
) =>
  violations.filter(
    (violation) =>
      violation &&
      typeof violation === 'object' &&
      typeof violation.ruleId === 'string',
  );

export const analyzeSecurity = (
  analysisContext,
) => {
  const violations =
    analysisContext?.rules?.security || [];

  return normalizeViolations(
    violations,
  ).map(
    (violation) => ({
      ...violation,
      category: 'security',
    }),
  );
};

class SecurityAnalyzer {
  constructor(ruleEngine) {
    this.ruleEngine = ruleEngine;
  }

  analyze({
    files,
    analysisByFile,
  }) {
    return this.ruleEngine.evaluate({
      files,
      analysisByFile,
      categories: ['security'],
    });
  }
}

export {
  SecurityAnalyzer,
};

export default analyzeSecurity;