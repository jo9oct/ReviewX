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

const SECURITY_TRANSPORT_RULES = [
  {
    id: 'security.insecure-http',
    category: 'security',
    name: 'Insecure HTTP URL',
    description:
      'Detects hardcoded HTTP URLs that may transmit data without transport encryption.',
    severity: 'medium',
    confidence: 'high',
    languages: ['*'],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      const matches = findMatches(
        source,
        'https?://[^\\s"\'`<>]+',
      ).filter(match =>
        match.text.startsWith(
          'http://',
        ),
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
  SECURITY_TRANSPORT_RULES,
};

export default SECURITY_TRANSPORT_RULES;