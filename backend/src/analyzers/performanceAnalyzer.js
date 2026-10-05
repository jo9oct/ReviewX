const normalizeViolations = (
  violations = [],
) =>
  Array.isArray(violations)
    ? violations.filter(
        (violation) =>
          violation &&
          typeof violation === 'object' &&
          typeof violation.ruleId === 'string',
      )
    : [];

const analyzePerformance = (
  analysisContext,
) => {
  const violations =
    analysisContext?.rules?.performance || [];

  return normalizeViolations(
    violations,
  ).map(
    (violation) => ({
      ...violation,
      category: 'performance',
    }),
  );
};

class PerformanceAnalyzer {
  constructor(ruleEngine) {
    this.ruleEngine = ruleEngine;
  }

  analyze({
    files = [],
    analysisByFile = {},
  }) {
    if (
      !this.ruleEngine ||
      typeof this.ruleEngine.evaluate !==
        'function'
    ) {
      return [];
    }

    return this.ruleEngine.evaluate({
      files,
      analysisByFile,
      categories: [
        'performance',
      ],
    });
  }
}

export {
  PerformanceAnalyzer,
  analyzePerformance,
};

export default analyzePerformance;