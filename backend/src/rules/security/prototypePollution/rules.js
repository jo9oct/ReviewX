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

const getPrototypePollutionCandidates = source => {
  const candidates = [];

  candidates.push(
    ...findMatches(
      source,
      '(?:__proto__|constructor\\.prototype|prototype\\s*\\[)',
    ),
  );

  candidates.push(
    ...findMatches(
      source,
      '\\b(?:merge|defaultsDeep|extend|assign|assignIn|mergeWith)\\s*\\([^\\n]*\\)',
    ),
  );

  return candidates;
};

const isPotentiallyUntrustedMerge = candidate => {
  const text = candidate.text.toLowerCase();

  return (
    /\breq\.(?:body|query|params|headers)\b/iu.test(
      text,
    ) ||
    /\brequest\.(?:body|query|params|headers)\b/iu.test(
      text,
    ) ||
    /\binput\b/iu.test(text) ||
    /\bdata\b/iu.test(text) ||
    /\bpayload\b/iu.test(text) ||
    /\buser(?:input|data)?\b/iu.test(text)
  );
};

const SECURITY_PROTOTYPE_POLLUTION_RULES = [
  {
    id: 'security.prototype-pollution',
    category: 'security',
    name: 'Potential Prototype Pollution',
    description:
      'Detects explicit prototype manipulation and object merge or assignment operations that may allow untrusted properties to pollute object prototypes.',
    severity: 'high',
    confidence: 'medium',
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
      const candidates =
        getPrototypePollutionCandidates(
          source,
        );

      const selectedCandidates = [];
      const seen = new Set();

      for (const candidate of candidates) {
        const isExplicitPrototypePattern =
          /(?:__proto__|constructor\.prototype|prototype\s*\[)/iu.test(
            candidate.text,
          );

        const isUnsafeMerge =
          isPotentiallyUntrustedMerge(
            candidate,
          );

        if (
          !isExplicitPrototypePattern &&
          !isUnsafeMerge
        ) {
          continue;
        }

        const key =
          `${candidate.index}:${candidate.text}`;

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        selectedCandidates.push(
          {
            ...candidate,
            detection:
              isExplicitPrototypePattern
                ? 'prototype-manipulation'
                : 'unsafe-object-merge',
          },
        );
      }

      return selectedCandidates.map(
        candidate => {
          const location =
            getLineLocation(
              candidate.index,
            );

          return createViolation({
            line: location.line,
            column: location.column,
            evidence: candidate.text,
            metadata: {
              detection:
                candidate.detection,
              limitation:
                'Static analysis cannot confirm whether prototype pollution is exploitable across all runtime object and library behaviors.',
            },
          });
        },
      );
    },
  },
];

export {
  SECURITY_PROTOTYPE_POLLUTION_RULES,
};

export default SECURITY_PROTOTYPE_POLLUTION_RULES;