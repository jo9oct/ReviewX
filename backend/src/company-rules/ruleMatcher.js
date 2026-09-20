
export function ruleApplies(
  rule,
  context
) {
  if (!rule?.enabled) {
    return false;
  }

  if (
    !rule.languages ||
    rule.languages.length === 0
  ) {
    return true;
  }

  const language =
    String(
      context?.language || ""
    )
      .trim()
      .toLowerCase();

  return rule.languages.includes(
    language
  );
}

export function findPatternMatches(
  rule,
  code
) {
  if (
    !rule?.pattern ||
    typeof code !== "string"
  ) {
    return [];
  }

  const pattern =
    createSafePattern(
      rule.pattern
    );

  if (!pattern) {
    return [];
  }

  const lines =
    code.split("\n");

  const matches = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    pattern.lastIndex = 0;

    if (
      pattern.test(line)
    ) {
      matches.push({
        line: index + 1,
        column:
          findColumn(
            line,
            pattern
          ),
        code: line
      });
    }
  }

  return matches;
}

function createSafePattern(
  value
) {
  try {
    return new RegExp(
      value,
      "i"
    );
  } catch {
    return null;
  }
}

function findColumn(
  line,
  pattern
) {
  pattern.lastIndex = 0;

  const match =
    pattern.exec(line);

  return match
    ? match.index + 1
    : 1;
}