const findMatches = (
  source,
  pattern,
  flags = 'gu',
) => {
  if (
    typeof source !== 'string' ||
    !(pattern instanceof RegExp)
  ) {
    return [];
  }

  const regex = new RegExp(
    pattern.source,
    flags,
  );

  const matches = [];

  for (const match of source.matchAll(regex)) {
    matches.push({
      text: match[0],
      index: match.index ?? 0,
    });
  }

  return matches;
};

const findMatchingBrace = (
  source,
  openingBraceIndex,
) => {
  if (
    typeof source !== 'string' ||
    !Number.isInteger(openingBraceIndex) ||
    source[openingBraceIndex] !== '{'
  ) {
    return -1;
  }

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (
    let index = openingBraceIndex;
    index < source.length;
    index += 1
  ) {
    const character = source[index];
    const nextCharacter =
      source[index + 1];

    if (lineComment) {
      if (
        character === '\n' ||
        character === '\r'
      ) {
        lineComment = false;
      }

      continue;
    }

    if (blockComment) {
      if (
        character === '*' &&
        nextCharacter === '/'
      ) {
        blockComment = false;
        index += 1;
      }

      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (
      character === '/' &&
      nextCharacter === '/'
    ) {
      lineComment = true;
      index += 1;
      continue;
    }

    if (
      character === '/' &&
      nextCharacter === '*'
    ) {
      blockComment = true;
      index += 1;
      continue;
    }

    if (
      character === '"' ||
      character === "'" ||
      character === '`'
    ) {
      quote = character;
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

const escapeRegExp = (value) =>
  value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );

const findFunctionDeclarations = (
  source,
) => {
  const declarations = [];

  const functionPattern =
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gu;

  for (
    const match of source.matchAll(
      functionPattern,
    )
  ) {
    const name = match[1];

    if (!name) {
      continue;
    }

    const start =
      match.index ?? 0;

    const openingBrace =
      source.indexOf(
        '{',
        start,
      );

    if (openingBrace < 0) {
      continue;
    }

    const closingBrace =
      findMatchingBrace(
        source,
        openingBrace,
      );

    if (closingBrace < 0) {
      continue;
    }

    declarations.push({
      name,
      start,
      openingBrace,
      closingBrace,
      body: source.slice(
        openingBrace + 1,
        closingBrace,
      ),
    });
  }

  return declarations;
};

const findArrowFunctions = (
  source,
) => {
  const declarations = [];

  const arrowPattern =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/gu;

  for (
    const match of source.matchAll(
      arrowPattern,
    )
  ) {
    const name = match[1];

    if (!name) {
      continue;
    }

    const start =
      match.index ?? 0;

    const openingBrace =
      source.indexOf(
        '{',
        start,
      );

    if (openingBrace < 0) {
      continue;
    }

    const closingBrace =
      findMatchingBrace(
        source,
        openingBrace,
      );

    if (closingBrace < 0) {
      continue;
    }

    declarations.push({
      name,
      start,
      openingBrace,
      closingBrace,
      body: source.slice(
        openingBrace + 1,
        closingBrace,
      ),
    });
  }

  return declarations;
};

const findFunctionBodies = (
  source,
) => [
  ...findFunctionDeclarations(source),
  ...findArrowFunctions(source),
].sort(
  (left, right) =>
    left.start - right.start,
);

const PERFORMANCE_RULES = [
  {
    id: 'performance.nested-loop',
    category: 'performance',
    name: 'Nested Loop',
    description:
      'Detects nested loop constructs that may produce quadratic or worse runtime behavior.',
    severity: 'medium',
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
      source,
      createViolation,
      getLineLocation,
    }) => {
      if (typeof source !== 'string') {
        return [];
      }

      const violations = [];

      const loopPattern =
        /\b(?:for|while|foreach)\b[^{]*\{/gu;

      const loops = Array.from(
        source.matchAll(loopPattern),
      );

      for (const outer of loops) {
        const outerStart =
          outer.index ?? 0;

        const openingBrace =
          source.indexOf(
            '{',
            outerStart,
          );

        if (openingBrace < 0) {
          continue;
        }

        const closingBrace =
          findMatchingBrace(
            source,
            openingBrace,
          );

        if (closingBrace < 0) {
          continue;
        }

        const body = source.slice(
          openingBrace + 1,
          closingBrace,
        );

        const nestedLoop =
          /\b(?:for|while|foreach)\b[^{]*\{/u.test(
            body,
          );

        if (!nestedLoop) {
          continue;
        }

        const location =
          getLineLocation(
            openingBrace,
          );

        violations.push(
          createViolation({
            line: location.line,
            column: location.column,
            evidence: source.slice(
              outerStart,
              Math.min(
                source.length,
                closingBrace + 1,
              ),
            ),
          }),
        );
      }

      return violations;
    },
  },

  {
    id: 'performance.repeated-json-parse',
    category: 'performance',
    name: 'Repeated JSON Parsing',
    description:
      'Detects JSON parsing inside common loop constructs where repeated parsing may be avoidable.',
    severity: 'low',
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
      if (typeof source !== 'string') {
        return [];
      }

      const pattern =
        /\b(?:for|while|forEach|map|filter|reduce)\b[\s\S]{0,1000}?\bJSON\.parse\s*\(/gu;

      const matches = findMatches(
        source,
        pattern,
        pattern.flags,
      );

      return matches.map(
        (match) => {
          const location =
            getLineLocation(
              match.index,
            );

          return createViolation({
            line: location.line,
            column: location.column,
            evidence: match.text.slice(
              0,
              500,
            ),
          });
        },
      );
    },
  },

  {
    id: 'performance.sync-file-operation',
    category: 'performance',
    name: 'Synchronous File Operation',
    description:
      'Detects synchronous filesystem operations that can block the event loop in Node.js applications.',
    severity: 'medium',
    confidence: 'high',
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
      if (typeof source !== 'string') {
        return [];
      }

      const pattern =
        /\b(?:readFileSync|writeFileSync|appendFileSync|existsSync|mkdirSync|rmSync|statSync|readdirSync)\s*\(/gu;

      const matches = findMatches(
        source,
        pattern,
        pattern.flags,
      );

      return matches.map(
        (match) => {
          const location =
            getLineLocation(
              match.index,
            );

          return createViolation({
            line: location.line,
            column: location.column,
            evidence: match.text,
          });
        },
      );
    },
  },

  {
    id: 'performance.unbounded-recursion-risk',
    category: 'performance',
    name: 'Potential Unbounded Recursion',
    description:
      'Detects functions that directly call themselves without an obvious structural guard.',
    severity: 'medium',
    confidence: 'medium',
    languages: [
      'javascript',
      'typescript',
      'python',
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
      if (typeof source !== 'string') {
        return [];
      }

      const violations = [];
      const functions =
        findFunctionBodies(source);

      for (const functionInfo of functions) {
        const escapedName =
          escapeRegExp(
            functionInfo.name,
          );

        const recursiveCallPattern =
          new RegExp(
            `\\b${escapedName}\\s*\\(`,
            'u',
          );

        if (
          !recursiveCallPattern.test(
            functionInfo.body,
          )
        ) {
          continue;
        }

        const location =
          getLineLocation(
            functionInfo.start,
          );

        violations.push(
          createViolation({
            line: location.line,
            column: location.column,
            evidence: source.slice(
              functionInfo.start,
              Math.min(
                source.length,
                functionInfo.closingBrace + 1,
              ),
            ),
          }),
        );
      }

      return violations;
    },
  },
];

export {
  PERFORMANCE_RULES,
};

export default PERFORMANCE_RULES;