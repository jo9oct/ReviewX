const findMatches = (
  source,
  pattern,
  flags = 'giu',
) => {
  const regex =
    new RegExp(
      pattern,
      flags,
    );

  const matches = [];

  for (
    const match of
    source.matchAll(regex)
  ) {
    matches.push({
      text: match[0],
      index:
        match.index ?? 0,
    });
  }

  return matches;
};

const normalizeName = value => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .toLowerCase();
};

const isHttpRequestSink = sink => {
  if (!sink) {
    return false;
  }

  const name =
    normalizeName(
      sink.name,
    );

  const lastSegment =
    name
      .split('.')
      .at(-1);

  /*
   * Supported HTTP client request APIs.
   */
  const supportedMethods =
    new Set([
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'request',
    ]);

  if (
    !supportedMethods.has(
      lastSegment,
    )
  ) {
    return false;
  }

  /*
   * Restrict generic method names to known
   * HTTP request clients. This prevents
   * unrelated calls such as:
   *
   * app.get(...)
   * database.get(...)
   * cache.get(...)
   *
   * from being classified as SSRF sinks.
   */
  const supportedClients =
    [
      'axios',
      'got',
      'request',
      'http',
      'https',
      'urllib.request',
      'requests',
      'fetch',
    ];

  return supportedClients.some(
    client =>
      name ===
        `${client}.${lastSegment}` ||
      name === client,
  );
};

const getTaintFlows = analysis => {
  if (
    !analysis ||
    typeof analysis !== 'object'
  ) {
    return [];
  }

  if (
    Array.isArray(
      analysis.flows,
    )
  ) {
    return analysis.flows;
  }

  if (
    typeof analysis.getFlows ===
    'function'
  ) {
    return analysis.getFlows();
  }

  return [];
};

const getFlowSourceName = flow =>
  normalizeName(
    flow?.source?.name,
  );

const getFlowSinkName = flow =>
  normalizeName(
    flow?.sink?.name,
  );

const isDynamicSource = flow => {
  const sourceName =
    getFlowSourceName(flow);

  if (!sourceName) {
    return false;
  }

  const segments =
    sourceName.split('.');

  if (!segments.length) {
    return false;
  }

  const root =
    segments[0];

  const dynamicMembers =
    new Set([
      'query',
      'params',
      'body',
      'headers',
      'cookies',
      'cookie',
      'form',
      'search',
    ]);

  return segments.some(
    (segment, index) =>
      index > 0 &&
      dynamicMembers.has(
        segment,
      ),
  );
};

const SECURITY_SSRF_RULES = [
  {
    id: 'security.ssrf',
    category: 'security',
    name:
      'Potential Server-Side Request Forgery',
    description:
      'Detects server-side HTTP requests that use dynamically controlled request targets.',
    severity: 'high',
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
      analysis,
      createViolation,
      getLineLocation,
    }) => {
      const violations = [];
      const seen = new Set();

      /*
       * Primary detection:
       *
       * source -> tainted variable ->
       * HTTP request sink
       */
      for (
        const flow of
        getTaintFlows(
          analysis,
        )
      ) {
        if (!flow) {
          continue;
        }

        if (
          flow.sanitized === true
        ) {
          continue;
        }

        if (
          !isDynamicSource(
            flow,
          )
        ) {
          continue;
        }

        if (
          !isHttpRequestSink(
            flow.sink,
          )
        ) {
          continue;
        }

        const location =
          flow.sink?.location;

        const line =
          location?.start?.line ??
          1;

        const column =
          location?.start?.column ??
          1;

        const evidence =
          flow.sink?.name ||
          'HTTP request';

        const key = [
          flow.filePath,
          line,
          column,
          evidence,
          getFlowSourceName(flow),
        ].join(':');

        if (
          seen.has(key)
        ) {
          continue;
        }

        seen.add(key);

        violations.push(
          createViolation({
            line,
            column,
            evidence,
            metadata: {
              detection:
                'taint-flow',
              source:
                flow.source?.name ||
                null,
              sink:
                flow.sink?.name ||
                null,
              sanitized:
                flow.sanitized === true,
            },
          }),
        );
      }

      /*
       * Fallback detection:
       *
       * Keep a lightweight source-based
       * fallback for cases where taint analysis
       * cannot resolve the flow.
       *
       * This does not replace taint analysis.
       */
      if (
        !violations.length &&
        typeof source === 'string'
      ) {
        const matches =
          findMatches(
            source,
            '\\b(?:axios\\.(?:get|post|put|patch|delete|request)|(?:http|https)\\.request|(?:http|https)\\.(?:get|post)|got\\.(?:get|post|put|patch|delete)|request\\.(?:get|post|put|patch|delete)|fetch)\\s*\\([^\\n]*\\b(?:req|request)\\.(?:query|params|body|headers|cookies|cookie)\\b',
          );

        for (
          const match of matches
        ) {
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
                  'dynamic-request-target',
              },
            }),
          );
        }
      }

      return violations;
    },
  },
];

export {
  SECURITY_SSRF_RULES,
};

export default SECURITY_SSRF_RULES;