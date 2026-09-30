const createViolation = ({
  rule,
  file,
  line,
  column = 1,
  endLine = line,
  endColumn = column,
  evidence,
  message,
  metadata = {},
}) => ({
  ruleId: rule.id,
  category: rule.category,
  ruleName: rule.name,
  severity: rule.severity,
  confidence: rule.confidence,
  message:
    message ||
    rule.description,
  description:
    rule.description,
  filePath: file.path,
  location: {
    start: {
      line,
      column,
    },
    end: {
      line: endLine,
      column: endColumn,
    },
  },
  evidence: {
    type: 'source',
    text: evidence,
  },
  metadata,
});

const getLineLocation = (
  source,
  offset,
) => {
  const safeSource =
    typeof source === 'string'
      ? source
      : '';

  const safeOffset = Math.max(
    0,
    Math.min(
      Number.isInteger(offset)
        ? offset
        : 0,
      safeSource.length,
    ),
  );

  const beforeOffset =
    safeSource.slice(
      0,
      safeOffset,
    );

  const lines =
    beforeOffset.split('\n');

  return {
    line: lines.length,
    column:
      lines.at(-1).length + 1,
  };
};

const getSourceLines = (
  source,
) =>
  typeof source === 'string'
    ? source.split(/\r?\n/u)
    : [];

const executeRule = (
  rule,
  context,
) => {
  if (
    !rule ||
    typeof rule.check !==
      'function'
  ) {
    return [];
  }

  const result =
    rule.check(context);

  if (!Array.isArray(result)) {
    return [];
  }

  return result.filter(Boolean);
};

const getRulesForFile = ({
  registry,
  language,
}) => {
  if (
    !registry ||
    typeof registry.getAll !==
      'function'
  ) {
    throw new TypeError(
      'Rule registry must provide a getAll() method.',
    );
  }

  const rules =
    registry.getAll();

  return rules.filter(
    (rule) => {
      if (!rule) {
        return false;
      }

      if (
        rule.enabled === false
      ) {
        return false;
      }

      if (
        !Array.isArray(
          rule.languages,
        )
      ) {
        return true;
      }

      if (
        rule.languages.includes('*')
      ) {
        return true;
      }

      return rule.languages.includes(
        language,
      );
    },
  );
};

class RuleEngine {
  constructor(registry) {
    if (
      !registry ||
      typeof registry.getAll !==
        'function'
    ) {
      throw new TypeError(
        'RuleEngine requires a valid RuleRegistry instance.',
      );
    }

    this.registry = registry;
  }

  evaluate({
    files,
    analysisByFile,
    categories = null,
    ruleIds = null,
  }) {
    if (!Array.isArray(files)) {
      throw new TypeError(
        'Rule engine files must be an array.',
      );
    }

    const selectedRuleIds =
      Array.isArray(ruleIds)
        ? new Set(ruleIds)
        : null;

    const selectedCategories =
      Array.isArray(categories)
        ? new Set(categories)
        : null;

    const violations = [];

    for (const file of files) {
      if (
        !file ||
        typeof file.path !==
          'string'
      ) {
        continue;
      }

      const analysis =
        analysisByFile?.get(
          file.path,
        ) || null;

      const rules =
        getRulesForFile({
          registry:
            this.registry,
          language:
            file.language,
        });

      for (const rule of rules) {
        if (
          selectedRuleIds &&
          !selectedRuleIds.has(
            rule.id,
          )
        ) {
          continue;
        }

        if (
          selectedCategories &&
          !selectedCategories.has(
            rule.category,
          )
        ) {
          continue;
        }

        const context = {
          file,
          analysis,
          source:
            file.content,
          lines:
            getSourceLines(
              file.content,
            ),

          createViolation: (
            input,
          ) =>
            createViolation({
              rule,
              file,
              ...input,
            }),

          getLineLocation: (
            offset,
          ) =>
            getLineLocation(
              file.content,
              offset,
            ),
        };

        const results =
          executeRule(
            rule,
            context,
          );

        for (
          const result of results
        ) {
          violations.push(
            result,
          );
        }
      }
    }

    return violations;
  }
}

export {
  RuleEngine,
  createViolation,
  getLineLocation,
};

export default RuleEngine;