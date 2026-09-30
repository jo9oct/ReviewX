const findMatches = (
  source,
  pattern,
  flags = 'giu',
) => {
  const regex = new RegExp(pattern, flags);
  const matches = [];

  for (const match of source.matchAll(regex)) {
    matches.push({
      text: match[0],
      index: match.index ?? 0,
    });
  }

  return matches;
};

const SECURITY_SECRET_RULES = [
  {
    id: 'security.hardcoded-secret',
    category: 'security',
    name: 'Potential Hardcoded Secret',
    description:
      'Detects source assignments that appear to contain hardcoded credentials, tokens, or API secrets.',
    severity: 'high',
    confidence: 'medium',
    languages: ['*'],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      const matches = findMatches(
        source,
        '\\b(api[_-]?key|secret|token|password|passwd|access[_-]?key)\\s*[=:]\\s*["\'][^"\'\\n]{8,}["\']',
      );

      return matches.map(match => {
        const location =
          getLineLocation(
            match.index,
          );

        return createViolation({
          line: location.line,
          column: location.column,
          evidence: match.text,
        });
      });
    },
  },
];

export {
  SECURITY_SECRET_RULES,
};

export default SECURITY_SECRET_RULES;