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

const SECURITY_DESERIALIZATION_RULES = [
  {
    id: 'security.unsafe-deserialization',
    category: 'security',
    name: 'Potential Unsafe Deserialization',
    description:
      'Detects deserialization APIs that may process untrusted input.',
    severity: 'high',
    confidence: 'medium',
    languages: [
      'javascript',
      'typescript',
      'python',
      'php',
      'java',
    ],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      const matches = findMatches(
        source,
        '\\b(?:pickle\\.loads|yaml\\.load\\s*\\(|unserialize\\s*\\(|ObjectInputStream|readObject\\s*\\(|node:vm\\.|eval\\s*\\()',
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
  SECURITY_DESERIALIZATION_RULES,
};

export default SECURITY_DESERIALIZATION_RULES;