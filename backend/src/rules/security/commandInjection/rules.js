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

const SECURITY_COMMAND_INJECTION_RULES = [
  {
    id: 'security.command-injection',
    category: 'security',
    name: 'Potential Command Injection',
    description:
      'Detects shell command execution APIs receiving dynamically constructed input.',
    severity: 'critical',
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
        '\\b(?:child_process\\.(?:exec|execSync|spawn|spawnSync)|exec\\(|execSync\\(|os\\.system\\(|subprocess\\.(?:run|Popen|call)|shell_exec\\(|Runtime\\.getRuntime\\(\\)\\.exec\\()',
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
  SECURITY_COMMAND_INJECTION_RULES,
};

export default SECURITY_COMMAND_INJECTION_RULES;