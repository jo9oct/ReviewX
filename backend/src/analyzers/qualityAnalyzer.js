const normalizeViolations = (
  violations = [],
) =>
  violations.filter(
    (violation) =>
      violation &&
      typeof violation === 'object' &&
      typeof violation.ruleId === 'string',
  );

export const analyzeQuality = (
  analysisContext,
) => {
  const violations =
    analysisContext?.rules?.quality || [];

  return normalizeViolations(
    violations,
  ).map(
    (violation) => ({
      ...violation,
      category: 'quality',
    }),
  );
};

class QualityAnalyzer {
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
      categories: ['quality'],
    });
  }
}

export {
  QualityAnalyzer,
};

export default analyzeQuality;