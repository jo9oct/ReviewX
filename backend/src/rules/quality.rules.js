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

const QUALITY_RULES = [
  {
    id: 'quality.long-function',
    category: 'quality',
    name: 'Long Function',
    description:
      'Detects functions that span a large number of source lines and may be difficult to maintain.',
    severity: 'low',
    confidence: 'medium',
    languages: [
      'javascript',
      'typescript',
      'python',
      'java',
      'c',
      'cpp',
      'go',
      'php',
      'csharp',
    ],
    enabled: true,

    check: ({
      lines,
      source,
      createViolation,
      getLineLocation,
    }) => {
      const violations = [];
      const threshold = 80;

      const functionPattern =
        /(?:function\s+[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{|[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{)/gu;

      for (const match of source.matchAll(
        functionPattern,
      )) {
        const matchIndex = match.index ?? 0;

        const start =
          getLineLocation(matchIndex);

        let depth = 0;
        let endLine = start.line;

        for (
          let index = matchIndex;
          index < source.length;
          index += 1
        ) {
          const character = source[index];

          if (character === '{') {
            depth += 1;
          } else if (character === '}') {
            depth -= 1;

            if (depth === 0) {
              endLine =
                getLineLocation(index).line;
              break;
            }
          }
        }

        const length =
          endLine - start.line + 1;

        if (length > threshold) {
          violations.push(
            createViolation({
              line: start.line,
              column: start.column,
              endLine,
              endColumn:
                lines[endLine - 1]?.length + 1 ||
                1,
              evidence: lines
                .slice(
                  start.line - 1,
                  Math.min(
                    endLine,
                    start.line + 4,
                  ),
                )
                .join('\n'),
              message:
                `Function spans approximately ${length} lines. ` +
                'Consider decomposing it into smaller units.',
              metadata: {
                lineCount: length,
                threshold,
              },
            }),
          );
        }
      }

      return violations;
    },
  },

  {
    id: 'quality.deep-nesting',
    category: 'quality',
    name: 'Deep Nesting',
    description:
      'Detects source regions with excessive brace nesting that can reduce readability.',
    severity: 'low',
    confidence: 'medium',
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
      const violations = [];
      const threshold = 6;

      let depth = 0;
      let reported = false;

      for (
        let index = 0;
        index < source.length;
        index += 1
      ) {
        if (source[index] === '{') {
          depth += 1;

          if (
            depth > threshold &&
            !reported
          ) {
            const location =
              getLineLocation(index);

            violations.push(
              createViolation({
                line: location.line,
                column: location.column,
                evidence: source.slice(
                  Math.max(0, index - 80),
                  Math.min(
                    source.length,
                    index + 80,
                  ),
                ),
                metadata: {
                  nestingDepth: depth,
                  threshold,
                },
              }),
            );

            reported = true;
          }
        } else if (
          source[index] === '}'
        ) {
          depth = Math.max(0, depth - 1);

          if (depth <= threshold) {
            reported = false;
          }
        }
      }

      return violations;
    },
  },

  {
    id: 'quality.any-type',
    category: 'quality',
    name: 'Explicit Any Type',
    description:
      'Detects explicit TypeScript any annotations that weaken static type checking.',
    severity: 'low',
    confidence: 'high',
    languages: ['typescript'],
    enabled: true,

    check: ({
      source,
      createViolation,
      getLineLocation,
    }) => {
      const matches = findMatches(
        source,
        ':\\s*any\\b|<any>',
      );

      return matches.map((match) => {
        const location =
          getLineLocation(match.index);

        return createViolation({
          line: location.line,
          column: location.column,
          evidence: match.text,
        });
      });
    },
  },

  {
    id: 'quality.duplicate-import',
    category: 'quality',
    name: 'Duplicate Import',
    description:
      'Detects repeated import statements for the same module.',
    severity: 'info',
    confidence: 'high',
    languages: [
      'javascript',
      'typescript',
    ],
    enabled: true,

    check: ({
      lines,
      createViolation,
      getLineLocation,
    }) => {
      const seen = new Map();
      const violations = [];

      for (
        const [index, line] of lines.entries()
      ) {
        const match = line.match(
          /^\s*import\s+.*?\s+from\s+['"]([^'"]+)['"]/u,
        );

        if (!match) {
          continue;
        }

        const moduleName = match[1];

        if (seen.has(moduleName)) {
          const offset = lines
            .slice(0, index)
            .reduce(
              (
                total,
                current,
              ) =>
                total +
                current.length +
                1,
              0,
            );

          const location =
            getLineLocation(offset);

          violations.push(
            createViolation({
              line: location.line,
              column: location.column,
              evidence: line,
            }),
          );
        } else {
          seen.set(moduleName, index);
        }
      }

      return violations;
    },
  },
];

export {
  QUALITY_RULES,
};

export default QUALITY_RULES;