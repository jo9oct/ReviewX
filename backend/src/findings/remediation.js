const normalizeRemediation = (remediation) => {
  if (
    remediation === null ||
    remediation === undefined
  ) {
    return null;
  }

  if (typeof remediation === 'string') {
    const value = remediation.trim();

    return value.length > 0
      ? value.slice(0, 5000)
      : null;
  }

  if (typeof remediation === 'object') {
    const summary =
      typeof remediation.summary === 'string'
        ? remediation.summary.trim()
        : null;

    const steps = Array.isArray(remediation.steps)
      ? remediation.steps
          .filter((step) => typeof step === 'string')
          .map((step) => step.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    if (!summary && steps.length === 0) {
      return null;
    }

    return {
      summary: summary
        ? summary.slice(0, 5000)
        : null,
      steps
    };
  }

  return null;
};

const createRemediation = ({
  summary,
  steps = []
}) => {
  return normalizeRemediation({
    summary,
    steps
  });
};

export {
  normalizeRemediation,
  createRemediation
};