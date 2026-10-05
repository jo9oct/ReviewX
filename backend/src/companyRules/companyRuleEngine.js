const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
};

const getLineLocation = (source, offset) => {
  const safeOffset = Math.max(
    0,
    Math.min(Number.isInteger(offset) ? offset : 0, source.length)
  );

  const beforeOffset = source.slice(0, safeOffset);
  const lines = beforeOffset.split('\n');

  return {
    line: lines.length,
    column: lines.at(-1).length + 1
  };
};

const createCompanyViolation = ({
  rule,
  file,
  source,
  index,
  evidence
}) => {
  const location = getLineLocation(source, index);

  return {
    ruleId: `company.${rule.id}`,
    category: rule.category,
    ruleName: rule.name,
    severity: rule.severity,
    confidence: rule.confidence,
    message: rule.description,
    description: rule.description,
    filePath: file.path,
    location: {
      start: {
        line: location.line,
        column: location.column
      },
      end: {
        line: location.line,
        column: location.column + evidence.length
      }
    },
    evidence: {
      type: 'source',
      text: evidence
    },
    metadata: {
      companyRule: true,
      remediation: rule.remediation || null
    }
  };
};

class CompanyRuleEngine {
  constructor(registry) {
    this.registry = registry;
  }

  evaluate({
    files,
    analysisByFile
  }) {
    if (!Array.isArray(files)) {
      throw new TypeError('Company rule files must be an array.');
    }

    const violations = [];

    for (const file of files) {
      const rules = this.registry.list({
        language: file.language,
        enabledOnly: true
      });

      for (const rule of rules) {
        const source = file.content;

        let pattern;

        if (rule.matcher.type === 'text') {
          pattern = new RegExp(
            escapeRegex(rule.matcher.pattern),
            rule.matcher.flags
          );
        } else {
          pattern = new RegExp(
            rule.matcher.pattern,
            rule.matcher.flags
          );
        }

        for (const match of source.matchAll(pattern)) {
          const evidence = match[0];

          if (!evidence) {
            continue;
          }

          violations.push(
            createCompanyViolation({
              rule,
              file,
              source,
              index: match.index ?? 0,
              evidence
            })
          );
        }
      }

      void analysisByFile;
    }

    return violations;
  }
}

export {
  CompanyRuleEngine,
  createCompanyViolation
};