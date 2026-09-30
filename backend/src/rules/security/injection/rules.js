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

const SECURITY_INJECTION_RULES = [
  {
    id: 'security.sql-injection',
    category: 'security',
    name: 'Potential SQL Injection',
    description:
      'Detects SQL query construction that appears to concatenate or interpolate runtime values.',
    severity: 'critical',
    confidence: 'medium',
    languages: [
      'javascript',
      'typescript',
      'python',
      'java',
      'php',
    ],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      const matches = findMatches(
        source,
        '\\b(?:SELECT|INSERT|UPDATE|DELETE)\\b[\\s\\S]{0,500}(?:\\+\\s*[A-Za-z_$][\\w$]*|\\$\\{[^}]+\\}|%\\s*[A-Za-z_$][\\w$]*)',
        'gim',
      );

      return matches.map(match => {
        const location =
          getLineLocation(
            match.index,
          );

        return createViolation({
          line: location.line,
          column: location.column,
          evidence:
            match.text.slice(
              0,
              500,
            ),
        });
      });
    },
  },
];

export {
  SECURITY_INJECTION_RULES,
};

export default SECURITY_INJECTION_RULES;