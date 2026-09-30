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

const normalizeName = value => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
};

const getLineLocationFromLine = (
  source,
  line,
  column = 1,
) => {
  const lines =
    typeof source === 'string'
      ? source.split(/\r?\n/u)
      : [];

  const safeLine = Math.max(
    1,
    Number.isInteger(line)
      ? line
      : 1,
  );

  const safeColumn = Math.max(
    1,
    Number.isInteger(column)
      ? column
      : 1,
  );

  if (!lines.length) {
    return {
      line: safeLine,
      column: safeColumn,
    };
  }

  return {
    line: safeLine,
    column: safeColumn,
  };
};

const getAnalysisFlows = analysis => {
  if (
    !analysis ||
    !Array.isArray(analysis.flows)
  ) {
    return [];
  }

  return analysis.flows.filter(Boolean);
};

const isSanitizedFlow = flow =>
  flow?.sanitized === true;

const getSinkName = sink => {
  if (!sink) {
    return '';
  }

  const name =
    typeof sink.name === 'string'
      ? sink.name
      : '';

  return normalizeName(name);
};

const getSinkLastSegment = sink => {
  const sinkName =
    getSinkName(sink);

  if (!sinkName) {
    return '';
  }

  return sinkName
    .split('.')
    .at(-1);
};

const XSS_RESPONSE_SINKS =
  new Set([
    'send',
    'end',
    'write',
  ]);

const XSS_BROWSER_SINK_PATTERN =
  '\\.(?:innerHTML|outerHTML|insertAdjacentHTML)\\s*=|document\\.write\\s*\\(';

const SECURITY_XSS_RULES = [
  {
    id: 'security.xss-risk',
    category: 'security',
    name: 'Potential Cross-Site Scripting Sink',
    description:
      'Detects potentially attacker-controlled content reaching browser or HTTP response output sinks.',
    severity: 'high',
    confidence: 'medium',
    languages: [
      'javascript',
      'typescript',
    ],
    enabled: true,

    check: ({
      source,
      analysis,
      createViolation,
      getLineLocation,
    }) => {
      const violations = [];

      const flows =
        getAnalysisFlows(
          analysis,
        );

      for (const flow of flows) {
        if (isSanitizedFlow(flow)) {
          continue;
        }

        const sink =
          flow.sink;

        const sinkName =
          getSinkLastSegment(
            sink,
          );

        if (
          !XSS_RESPONSE_SINKS.has(
            sinkName,
          )
        ) {
          continue;
        }

        const location =
          sink?.location?.start;

        const lineLocation =
          getLineLocationFromLine(
            source,
            location?.line,
            location?.column,
          );

        const evidence =
          typeof sink?.name ===
          'string'
            ? sink.name
            : sinkName;

        violations.push(
          createViolation({
            line:
              lineLocation.line,
            column:
              lineLocation.column,
            evidence,
            message:
              `Potential cross-site scripting risk: attacker-controlled input reaches ${evidence} without detected sanitization.`,
            metadata: {
              detection: 'taint-flow',
              source:
                flow.source?.name ||
                null,
              sink:
                sink?.name ||
                null,
              sanitized:
                flow.sanitized === true,
            },
          }),
        );
      }

      const matches =
        findMatches(
          source,
          XSS_BROWSER_SINK_PATTERN,
        );

      for (const match of matches) {
        const location =
          getLineLocation(
            match.index,
          );

        violations.push(
          createViolation({
            line:
              location.line,
            column:
              location.column,
            evidence:
              match.text,
            metadata: {
              detection:
                'browser-dom-sink',
            },
          }),
        );
      }

      const uniqueViolations =
        new Map();

      for (
        const violation of
        violations
      ) {
        const key = [
          violation.ruleId,
          violation.filePath,
          violation.location
            ?.start?.line ?? 0,
          violation.location
            ?.start?.column ?? 0,
          violation.evidence
            ?.text ?? '',
        ].join(':');

        if (
          !uniqueViolations.has(
            key,
          )
        ) {
          uniqueViolations.set(
            key,
            violation,
          );
        }
      }

      return [
        ...uniqueViolations.values(),
      ];
    },
  },
];

export {
  SECURITY_XSS_RULES,
};

export default SECURITY_XSS_RULES;