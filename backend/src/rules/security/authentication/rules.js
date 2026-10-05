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

const SECURITY_AUTHENTICATION_RULES = [
  {
    id: 'security.weak-authentication',
    category: 'security',
    name: 'Potential Weak Authentication',
    description:
      'Detects authentication implementations that may use weak password comparison or plaintext credential handling.',
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
        '\\b(?:password|passwd|userPassword|plainPassword)\\b\\s*(?:===|==|=)\\s*\\b(?:req\\.body\\.|request\\.body\\.)?\\w+',
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
  SECURITY_AUTHENTICATION_RULES,
};

export default SECURITY_AUTHENTICATION_RULES;