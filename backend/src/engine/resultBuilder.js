const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value instanceof Map) {
    return [...value.values()];
  }

  return [];
};

const buildSymbolSummary = (symbols) => {
  if (!(symbols instanceof Map)) {
    return {
      files: 0,
      symbols: 0,
    };
  }

  let symbolCount = 0;

  for (const value of symbols.values()) {
    if (
      value &&
      typeof value.getSymbols ===
        'function'
    ) {
      const fileSymbols =
        value.getSymbols();

      if (
        Array.isArray(
          fileSymbols
        )
      ) {
        symbolCount +=
          fileSymbols.length;
      }

      continue;
    }

    if (
      value &&
      typeof value === 'object' &&
      Array.isArray(
        value.symbols
      )
    ) {
      symbolCount +=
        value.symbols.length;

      continue;
    }

    if (Array.isArray(value)) {
      symbolCount +=
        value.length;
    }
  }

  return {
    files: symbols.size,
    symbols: symbolCount,
  };
};

const getGraphSize = (graph) => {
  if (
    !graph ||
    typeof graph !== 'object'
  ) {
    return {
      nodes: 0,
      edges: 0,
    };
  }

  let nodes = 0;
  let edges = 0;

  if (
    typeof graph.getNodes ===
      'function'
  ) {
    const graphNodes =
      graph.getNodes();

    nodes = Array.isArray(
      graphNodes
    )
      ? graphNodes.length
      : 0;
  } else if (
    graph.nodes instanceof Map
  ) {
    nodes =
      graph.nodes.size;
  } else if (
    Array.isArray(
      graph.nodes
    )
  ) {
    nodes =
      graph.nodes.length;
  }

  if (
    typeof graph.getEdges ===
      'function'
  ) {
    const graphEdges =
      graph.getEdges();

    edges = Array.isArray(
      graphEdges
    )
      ? graphEdges.length
      : 0;
  } else if (
    Array.isArray(graph.edges)
  ) {
    edges =
      graph.edges.length;
  }

  return {
    nodes,
    edges,
  };
};

const buildCallGraphSummary = (
  callGraph
) => {
  return getGraphSize(
    callGraph
  );
};

const buildTaintSummary = (
  taint
) => {
  if (
    !taint ||
    typeof taint !== 'object'
  ) {
    return {
      sources: 0,
      sinks: 0,
      sanitizers: 0,
      flows: 0,
    };
  }

  const getCollectionSize = (
    value,
    getter
  ) => {
    if (
      typeof taint[getter] ===
        'function'
    ) {
      const collection =
        taint[getter]();

      return Array.isArray(
        collection
      )
        ? collection.length
        : 0;
    }

    return Array.isArray(
      value
    )
      ? value.length
      : 0;
  };

  return {
    sources:
      getCollectionSize(
        taint.sources,
        'getSources'
      ),

    sinks:
      getCollectionSize(
        taint.sinks,
        'getSinks'
      ),

    sanitizers:
      getCollectionSize(
        taint.sanitizers,
        'getSanitizers'
      ),

    flows:
      getCollectionSize(
        taint.flows,
        'getFlows'
      ),
  };
};

const buildReviewResult = ({
  context,
  parsedFiles,
  analysisContext,
  staticAnalysis,
  findings,
  score,
  aiAnalysis,
}) => {
  const sourceFiles =
    context?.files instanceof Map
      ? [
          ...context.files.values(),
        ]
      : Array.isArray(
          context?.files
        )
        ? context.files
        : [];

  const parsedFileMap =
    parsedFiles instanceof Map
      ? parsedFiles
      : new Map();

  const files =
    sourceFiles.map(
      (file) => {
        const parsed =
          parsedFileMap.get(
            file.path
          );

        return {
          path: file.path,

          language:
            file.language ||
            parsed?.language ||
            null,

          byteLength:
            file.byteLength ??
            0,

          hash:
            file.hash ||
            null,

          parser: parsed
            ? {
                supported:
                  parsed.supported ===
                  true,

                language:
                  parsed.language ||
                  file.language ||
                  null,
              }
            : {
                supported: false,

                language:
                  file.language ||
                  null,
              },
        };
      }
    );

  const analysis =
    analysisContext &&
    typeof analysisContext ===
      'object'
      ? analysisContext
      : null;

  const symbols =
    analysis?.symbols instanceof
    Map
      ? analysis.symbols
      : new Map();

  const controlFlow =
    analysis?.controlFlow instanceof
    Map
      ? analysis.controlFlow
      : new Map();

  const dataFlow =
    analysis?.dataFlow instanceof
    Map
      ? analysis.dataFlow
      : new Map();

  const metrics =
    analysis?.metrics instanceof
    Map
      ? analysis.metrics
      : new Map();

  const callGraph =
    buildCallGraphSummary(
      analysis?.callGraph
    );

  const taint =
    buildTaintSummary(
      analysis?.taint
    );

  const security =
    toArray(
      staticAnalysis?.security
    );

  const bugs =
    toArray(
      staticAnalysis?.bugs
    );

  const quality =
    toArray(
      staticAnalysis?.quality
    );

  const performance =
    toArray(
      staticAnalysis?.performance
    );

  const company =
    toArray(
      staticAnalysis?.company
    );

  const allViolations = [
    ...security,
    ...bugs,
    ...quality,
    ...performance,
    ...company,
  ];

  return {
    status:
      context?.status ||
      'completed',

    files,

    analysis: {
      symbols:
        buildSymbolSummary(
          symbols
        ),

      controlFlowFiles:
        controlFlow.size,

      dataFlowFiles:
        dataFlow.size,

      callGraph,

      taintAnalysis:
        taint,

      metrics:
        Object.fromEntries(
          metrics
        ),
    },

    staticAnalysis: {
      security,

      bugs,

      quality,

      performance,

      company,

      totalViolations:
        allViolations.length,
    },

    findings:
      Array.isArray(findings)
        ? findings
        : [],

    score:
      score ?? null,

    aiAnalysis:
      aiAnalysis ?? null,

    metadata:
      context?.metadata ||
      {},
  };
};

export {
  buildReviewResult,
};

export default buildReviewResult;