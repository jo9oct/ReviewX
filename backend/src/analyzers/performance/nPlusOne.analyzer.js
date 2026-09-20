
import {
  createFinding
} from "../../analysis/findingFactory.js";

const LOOP_START_PATTERN =
  /^\s*(?:for|forEach|while)\b/;

const LOOP_OPEN_PATTERN =
  /\b(?:for|forEach|while)\s*\([^)]*\)\s*\{/;

const DATABASE_QUERY_PATTERNS = [
  {
    pattern:
      /\.\s*(?:find|findOne|findById|findMany|findFirst|findUnique|findAll|aggregate|count|exists)\s*\(/i,
    name: "database query"
  },
  {
    pattern:
      /\b(?:SELECT|INSERT|UPDATE|DELETE)\b/i,
    name: "SQL query"
  },
  {
    pattern:
      /\b(?:query|execute|exec)\s*\(/i,
    name: "database execution"
  },
  {
    pattern:
      /\b(?:Model|Repository|repo|repository)\b.*\.(?:find|findOne|findById|findMany|findFirst|findUnique|findAll|query|execute)\s*\(/i,
    name: "repository query"
  }
];

export function analyzeNPlusOne(
  context
) {
  if (!context?.code) {
    return [];
  }

  const lines =
    context.code.split("\n");

  const findings = [];

  const blocks =
    findLoopBlocks(lines);

  for (const block of blocks) {
    const queries =
      findQueriesInsideBlock(
        lines,
        block
      );

    if (queries.length === 0) {
      continue;
    }

    for (const query of queries) {
      findings.push(
        createFinding({
          category: "performance",
          type: "n-plus-one-query",
          ruleId: "PERF-N1-001",
          title:
            "Potential N+1 database query pattern detected.",
          description:
            `A ${query.name} is executed inside a loop. If the loop runs once per record, this can cause one database operation per iteration instead of using a batched or joined query.`,
          severity: "medium",
          confidence: "medium",
          status: "detected",
          file: context.fileName,
          line: query.line,
          column: query.column,
          code: query.code,
          evidence: [
            {
              type: "pattern",
              file: context.fileName,
              line: query.line,
              column: query.column,
              code: query.code,
              description:
                `The ${query.name} appears inside a loop spanning lines ${block.startLine}-${block.endLine}.`
            }
          ],
          recommendation:
            "Avoid executing a database query for every loop iteration. Consider eager loading, joins, aggregation, batching, bulk queries, or fetching the required records before entering the loop.",
          analyzer: "n-plus-one"
        })
      );
    }
  }

  return deduplicateFindings(
    findings
  );
}

function findLoopBlocks(
  lines
) {
  const blocks = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    if (
      !isLoopStart(line)
    ) {
      continue;
    }

    const endIndex =
      findBlockEnd(
        lines,
        index
      );

    if (
      endIndex <= index
    ) {
      continue;
    }

    blocks.push({
      startLine: index + 1,
      endLine: endIndex + 1,
      startIndex: index,
      endIndex
    });

    index = endIndex;
  }

  return blocks;
}

function isLoopStart(
  line
) {
  return (
    LOOP_START_PATTERN.test(
      line
    ) ||
    LOOP_OPEN_PATTERN.test(
      line
    )
  );
}

function findBlockEnd(
  lines,
  startIndex
) {
  let depth = 0;
  let opened = false;

  for (
    let index = startIndex;
    index < lines.length;
    index += 1
  ) {
    const line =
      removeStringsAndComments(
        lines[index]
      );

    const opening =
      countCharacter(
        line,
        "{"
      );

    const closing =
      countCharacter(
        line,
        "}"
      );

    if (opening > 0) {
      opened = true;
    }

    depth += opening;
    depth -= closing;

    if (
      opened &&
      depth <= 0
    ) {
      return index;
    }
  }

  return startIndex;
}

function findQueriesInsideBlock(
  lines,
  block
) {
  const queries = [];

  for (
    let index =
      block.startIndex;
    index <= block.endIndex;
    index += 1
  ) {
    const originalLine =
      lines[index];

    const line =
      removeStringsAndComments(
        originalLine
      );

    for (
      const queryPattern of DATABASE_QUERY_PATTERNS
    ) {
      if (
        queryPattern.pattern.test(
          line
        )
      ) {
        queries.push({
          line: index + 1,
          column:
            findQueryColumn(
              originalLine
            ),
          code: originalLine,
          name:
            queryPattern.name
        });

        break;
      }
    }
  }

  return queries;
}

function findQueryColumn(
  line
) {
  for (
    const queryPattern of DATABASE_QUERY_PATTERNS
  ) {
    const match =
      queryPattern.pattern.exec(
        line
      );

    if (match) {
      return match.index + 1;
    }
  }

  return 1;
}

function removeStringsAndComments(
  line
) {
  return line
    .replace(
      /(["'`])(?:\\.|(?!\1).)*\1/g,
      ""
    )
    .replace(
      /\/\/.*$/,
      ""
    )
    .replace(
      /#.*$/,
      ""
    );
}

function countCharacter(
  value,
  character
) {
  return [
    ...value
  ].filter(
    (item) =>
      item === character
  ).length;
}

function deduplicateFindings(
  findings
) {
  const seen =
    new Set();

  return findings.filter(
    (finding) => {
      const key =
        [
          finding.ruleId,
          finding.file,
          finding.line,
          finding.column
        ].join(":");

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}