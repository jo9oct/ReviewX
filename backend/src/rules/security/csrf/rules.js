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

const SECURITY_CSRF_RULES = [
  {
    id: 'security.csrf',
    category: 'security',
    name: 'Potential Cross-Site Request Forgery',
    description:
      'Detects state-changing HTTP endpoints that may lack an identifiable CSRF protection mechanism.',
    severity: 'medium',
    confidence: 'low',
    languages: [
      'javascript',
      'typescript',
    ],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      const matches = findMatches(
        source,
        '\\b(?:app|router)\\.(?:post|put|patch|delete)\\s*\\(',
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
          metadata: {
            detection:
              'state-changing-endpoint',
            limitation:
              'Static analysis cannot confirm whether external CSRF protection exists.',
          },
        });
      });
    },
  },
];

export {
  SECURITY_CSRF_RULES,
};

export default SECURITY_CSRF_RULES;