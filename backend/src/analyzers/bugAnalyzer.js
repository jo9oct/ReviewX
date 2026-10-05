const normalizeViolations = (
  violations = [],
) =>
  violations.filter(
    (violation) =>
      violation &&
      typeof violation === 'object' &&
      typeof violation.ruleId === 'string',
  );

export const analyzeBugs = (
  analysisContext,
) => {
  const violations =
    analysisContext?.rules?.bugs || [];

  return normalizeViolations(
    violations,
  ).map(
    (violation) => ({
      ...violation,
      category: 'bug',
    }),
  );
};

class BugAnalyzer {
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
      categories: ['bug'],
    });
  }
}

export {
  BugAnalyzer,
};

export default analyzeBugs;