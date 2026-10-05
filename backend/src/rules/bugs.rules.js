const findMatches = (
  source,
  pattern,
  flags = 'gu',
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

const BUG_RULES = [
  {
    id: 'bug.empty-catch',
    category: 'bug',
    name: 'Empty Exception Handler',
    description:
      'Detects empty catch blocks that silently discard exceptions.',
    severity: 'medium',
    confidence: 'high',
    languages: [
      'javascript',
      'typescript',
      'java',
      'csharp',
      'python',
    ],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      const matches = findMatches(
        source,
        '\\bcatch\\s*(?:\\([^)]*\\))?\\s*\\{\\s*\\}',
      );

      return matches.map((match) => {
        const location = getLineLocation(
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

  {
    id: 'bug.todo-fixme',
    category: 'bug',
    name: 'Unresolved TODO or FIXME',
    description:
      'Detects TODO or FIXME markers that may indicate incomplete implementation.',
    severity: 'low',
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
        '\\b(?:TODO|FIXME)\\b[^\\n]*',
      );

      return matches.map((match) => {
        const location = getLineLocation(
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

  {
    id: 'bug.constant-boolean-condition',
    category: 'bug',
    name: 'Constant Boolean Condition',
    description:
      'Detects simple conditions that always evaluate to a constant boolean.',
    severity: 'medium',
    confidence: 'high',
    languages: [
      'javascript',
      'typescript',
      'java',
      'c',
      'cpp',
      'csharp',
    ],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      const matches = findMatches(
        source,
        '\\b(?:if|while)\\s*\\(\\s*(?:true|false|True|False)\\s*\\)',
      );

      return matches.map((match) => {
        const location = getLineLocation(
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

  {
    id: 'bug.debug-output',
    category: 'bug',
    name: 'Debug Output Left in Source',
    description:
      'Detects common debugging output that may have been unintentionally left in production code.',
    severity: 'low',
    confidence: 'medium',
    languages: [
      'javascript',
      'typescript',
      'python',
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
        '\\b(?:console\\.log|console\\.debug|print|System\\.out\\.println)\\s*\\(',
      );

      return matches.map((match) => {
        const location = getLineLocation(
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
  BUG_RULES,
};

export default BUG_RULES;