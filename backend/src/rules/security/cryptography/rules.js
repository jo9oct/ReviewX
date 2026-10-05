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

const SECURITY_CRYPTOGRAPHY_RULES = [
  {
    id: 'security.weak-cryptography',
    category: 'security',
    name: 'Weak Cryptographic Algorithm',
    description:
      'Detects use of cryptographic algorithms commonly considered weak or unsuitable for new security-sensitive applications.',
    severity: 'medium',
    confidence: 'high',
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
        '\\b(?:md5|sha1|des|3des|rc4)\\b',
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
  SECURITY_CRYPTOGRAPHY_RULES,
};

export default SECURITY_CRYPTOGRAPHY_RULES;