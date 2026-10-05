const SECRET_PATTERNS = [
  /\b(?:api[_-]?key|secret|password|passwd|token|access[_-]?key)\b\s*[=:]\s*["'][^"'\n]{8,}["']/iu,
  /\bsk-[A-Za-z0-9_-]{16,}\b/iu,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/iu,
];

const containsLikelySecret = value => {
  if (typeof value !== 'string') {
    return false;
  }

  return SECRET_PATTERNS.some(pattern =>
    pattern.test(value),
  );
};

const sanitizeSourceForAi = source => {
  if (typeof source !== 'string') {
    return '';
  }

  let sanitized = source;

  for (const pattern of SECRET_PATTERNS) {
    const globalPattern = new RegExp(
      pattern.source,
      `${pattern.flags}g`,
    );

    sanitized = sanitized.replace(
      globalPattern,
      '[REDACTED_SECRET]',
    );
  }

  return sanitized;
};

const sanitizeAiContext = context => {
  if (
    !context ||
    typeof context !== 'object'
  ) {
    return null;
  }

  return {
    ...context,

    files: Array.isArray(context.files)
      ? context.files.map(file => ({
          ...file,
          source: sanitizeSourceForAi(
            file.source,
          ),
        }))
      : [],

    findings: Array.isArray(
      context.findings,
    )
      ? context.findings.map(finding => ({
          ...finding,
          evidence: finding.evidence
            ? {
                ...finding.evidence,
                text: sanitizeSourceForAi(
                  finding.evidence.text,
                ),
              }
            : null,
        }))
      : [],
  };
};

const validateAiResponse = response => {
  if (
    !response ||
    typeof response !== 'object'
  ) {
    return {
      valid: false,
      reason:
        'AI response is not an object.',
    };
  }

  if (
    typeof response.summary !==
    'string'
  ) {
    return {
      valid: false,
      reason:
        'AI response does not contain a valid summary.',
    };
  }

  if (
    !Array.isArray(
      response.findings,
    )
  ) {
    return {
      valid: false,
      reason:
        'AI response findings must be an array.',
    };
  }

  return {
    valid: true,
    value: response,
  };
};

const validateImprovementResponse =
  response => {
    if (
      !response ||
      typeof response !== 'object'
    ) {
      return {
        valid: false,
        reason:
          'AI improvement response is not an object.',
      };
    }

    if (
      !Array.isArray(
        response.improvements,
      )
    ) {
      return {
        valid: false,
        reason:
          'AI improvement response must contain an improvements array.',
      };
    }

    return {
      valid: true,
      value: response,
    };
  };

const validateSummaryResponse =
  response => {
    if (
      !response ||
      typeof response !== 'object'
    ) {
      return {
        valid: false,
        reason:
          'AI summary response is not an object.',
      };
    }

    if (
      typeof response.summary !==
      'string'
    ) {
      return {
        valid: false,
        reason:
          'AI summary response must contain a summary string.',
      };
    }

    if (
      !Array.isArray(
        response.riskAreas,
      )
    ) {
      return {
        valid: false,
        reason:
          'AI summary response riskAreas must be an array.',
      };
    }

    if (
      !Array.isArray(
        response.priorities,
      )
    ) {
      return {
        valid: false,
        reason:
          'AI summary response priorities must be an array.',
      };
    }

    return {
      valid: true,
      value: response,
    };
  };

const validateFindingAnalysisResponse =
  response => {
    if (
      !response ||
      typeof response !== 'object'
    ) {
      return {
        valid: false,
        reason:
          'AI finding-analysis response is not an object.',
      };
    }

    const assessments = new Set([
      'confirmed',
      'likely',
      'uncertain',
      'not_supported',
    ]);

    if (
      !assessments.has(
        response.assessment,
      )
    ) {
      return {
        valid: false,
        reason:
          'AI finding-analysis response contains an invalid assessment.',
      };
    }

    if (
      typeof response.explanation !==
      'string'
    ) {
      return {
        valid: false,
        reason:
          'AI finding-analysis response must contain an explanation string.',
      };
    }

    if (
      typeof response.remediation !==
      'string'
    ) {
      return {
        valid: false,
        reason:
          'AI finding-analysis response must contain a remediation string.',
      };
    }

    return {
      valid: true,
      value: response,
    };
  };

export {
  containsLikelySecret,
  sanitizeSourceForAi,
  sanitizeAiContext,
  validateAiResponse,
  validateImprovementResponse,
  validateSummaryResponse,
  validateFindingAnalysisResponse,
};