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

const SECURITY_AUTHORIZATION_RULES = [
  {
    id: 'security.missing-authorization-check',
    category: 'security',
    name: 'Potential Missing Authorization Check',
    description:
      'Detects resource endpoints where an authorization check is not visibly present in the endpoint source.',
    severity: 'high',
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
        '\\b(?:app|router)\\.(?:get|put|patch|delete)\\s*\\([^\\n]*\\b(?:/:id|/:userId|/:accountId|/:resourceId)\\b',
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
              'resource-endpoint',
            limitation:
              'Static pattern analysis cannot determine authorization behavior across middleware and services.',
          },
        });
      });
    },
  },
];

export {
  SECURITY_AUTHORIZATION_RULES,
};

export default SECURITY_AUTHORIZATION_RULES;