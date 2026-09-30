import {
  calculateScores
} from './scoreCalculator.js';

const countBySeverity = (findings) => {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };

  for (const finding of findings) {
    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        finding.severity
      )
    ) {
      counts[finding.severity] += 1;
    }
  }

  return counts;
};

const countByCategory = (findings) => {
  const counts = {
    security: 0,
    bug: 0,
    quality: 0,
    performance: 0
  };

  for (const finding of findings) {
    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        finding.category
      )
    ) {
      counts[finding.category] += 1;
    }
  }

  return counts;
};

class ScoreEngine {
  calculate(findings) {
    if (!Array.isArray(findings)) {
      throw new TypeError(
        'Score engine requires an array of findings.'
      );
    }

    const scores =
      calculateScores(findings);

    return {
      overall: scores.overall,
      categories: scores.categories,
      counts: {
        total: findings.length,
        bySeverity:
          countBySeverity(findings),
        byCategory:
          countByCategory(findings)
      }
    };
  }
}

const scoreEngine =
  new ScoreEngine();

export {
  ScoreEngine,
  scoreEngine
};