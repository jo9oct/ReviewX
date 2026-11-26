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
      const matches = [];

      // if (true|false) or while (false) is always constant/dead code
      const deadBranchMatches = findMatches(
        source,
        '\\b(?:if\\s*\\(\\s*(?:true|false|True|False)\\s*\\)|while\\s*\\(\\s*(?:false|False)\\s*\\))',
      );
      matches.push(...deadBranchMatches);

      // while (true) is an intentional loop pattern in servers/workers if there is a break/return/throw/exit
      // Only flag while(true) if no exit mechanism exists in the source
      const hasExit = /\b(?:break|return|throw|raise|process\.exit|sys\.exit)\b/.test(source);
      if (!hasExit) {
        const infiniteLoopMatches = findMatches(
          source,
          '\\bwhile\\s*\\(\\s*(?:true|True)\\s*\\)',
        );
        matches.push(...infiniteLoopMatches);
      }

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
      file,
      source,
      lines,
      createViolation,
      getLineLocation,
    }) => {
      if (typeof source !== 'string') return [];

      const lang = file?.language || 'text';
      const filePath = file?.path || '';
      const isPython =
        lang === 'python' ||
        filePath.endsWith('.py') ||
        (lang === 'text' &&
          /\b(?:def|import|elif)\b/.test(source) &&
          !/[{};]/.test(source));

      const isJsTs =
        lang === 'javascript' ||
        lang === 'typescript' ||
        /\.[jt]sx?$/i.test(filePath);

      const isJava = lang === 'java' || /\.java$/i.test(filePath);

      const matches = [];

      if (isPython) {
        // In Python, print(...) is standard output (e.g. print("hello") or CLI tools).
        // Standard print(...) MUST NOT be flagged as a bug.
        // Only flag genuine debug statements: breakpoint(), pdb/ipdb/pudb, ic(), or explicit debug prints.
        const pythonDebugMatches = findMatches(
          source,
          '\\b(?:breakpoint\\s*\\(|(?:pdb|ipdb|pudb)\\.set_trace\\s*\\(|ic\\s*\\()|\\bprint\\s*\\(\\s*f?["\']\\s*\\[?(?:DEBUG|TEMP|TEST)\\]?:?\\s*',
        );
        matches.push(...pythonDebugMatches);
      } else if (isJsTs) {
        // In JavaScript/TypeScript:
        // debugger statement and console.debug are always debug statements.
        // For console.log:
        // If file is a short script / snippet (<= 15 lines), or in a test/cli/script file,
        // it is intentional stdout. In large production modules (> 15 lines), console.log is flagged.
        // DO NOT match bare print(...) in JavaScript/TypeScript!
        const totalLines = Array.isArray(lines)
          ? lines.length
          : source.split('\n').length;
        const isSnippetOrScript =
          totalLines <= 15 ||
          /[\b._-](?:test|spec|cli|scripts?|example|sample)\b/i.test(filePath);

        const jsPattern = isSnippetOrScript
          ? '\\b(?:console\\.debug\\s*\\(|debugger\\s*;?)'
          : '\\b(?:console\\.log|console\\.debug)\\s*\\(|\\bdebugger\\s*;?';

        matches.push(...findMatches(source, jsPattern));
      } else if (isJava) {
        // In Java: System.out.println / System.err.println / printStackTrace
        // Exclude test files
        const isTest = /[\b._-](?:test|spec)\b/i.test(filePath);
        if (!isTest) {
          matches.push(
            ...findMatches(
              source,
              '\\b(?:System\\.(?:out|err)\\.print(?:ln)?|\\.printStackTrace)\\s*\\(',
            ),
          );
        }
      } else {
        // Generic: flag debugger statements and console.debug, but NEVER plain print(...)
        matches.push(
          ...findMatches(
            source,
            '\\b(?:console\\.debug|debugger\\b|System\\.out\\.println)',
          ),
        );
      }

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