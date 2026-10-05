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

const findRegexLiterals = source => {
  return findMatches(
    source,
    '/(?:[^/\\\\\\n]|\\\\.)+/[a-z]*',
  );
};

const hasNestedQuantifier = pattern => {
  const nestedQuantifierPatterns = [
    /\([^()\n]*[+*][^()\n]*\)[+*]/u,
    /\([^()\n]*[+*][^()\n]*\)\{[0-9]+,/u,
    /\([^()\n]*\{[0-9]+,[^}]*\}[^()\n]*\)[+*]/u,
    /\[[^\]\n]+\][+*][^+\n]{0,20}[+*]/u,
  ];

  return nestedQuantifierPatterns.some(
    nestedPattern =>
      nestedPattern.test(pattern),
  );
};

const SECURITY_REGEX_DOS_RULES = [
  {
    id: 'security.regex-dos',
    category: 'security',
    name: 'Potential Regular Expression DoS',
    description:
      'Detects regular expressions containing potentially problematic nested quantifier patterns that may cause excessive backtracking.',
    severity: 'medium',
    confidence: 'low',
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
      const regexLiterals =
        findRegexLiterals(source);

      const violations = [];
      const seen = new Set();

      for (const match of regexLiterals) {
        const regexLiteral =
          match.text;

        if (
          !hasNestedQuantifier(
            regexLiteral,
          )
        ) {
          continue;
        }

        const key =
          `${match.index}:${regexLiteral}`;

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);

        const location =
          getLineLocation(
            match.index,
          );

        violations.push(
          createViolation({
            line: location.line,
            column: location.column,
            evidence: regexLiteral,
            metadata: {
              detection:
                'nested-quantifier-pattern',
              limitation:
                'Pattern analysis alone cannot prove catastrophic backtracking or runtime exploitability.',
            },
          }),
        );
      }

      return violations;
    },
  },
];

export {
  SECURITY_REGEX_DOS_RULES,
};

export default SECURITY_REGEX_DOS_RULES;