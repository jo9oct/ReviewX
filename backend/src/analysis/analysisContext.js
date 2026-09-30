import { AppError } from '../utils/errors.js';

const createEmptyCallGraph = () => ({
  nodes: new Map(),
  edges: [],
});

const createEmptyTaint = () => ({
  sources: [],
  sinks: [],
  sanitizers: [],
  flows: [],
});

const normalizeMap = value => {
  if (value instanceof Map) {
    return new Map(value);
  }

  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return new Map(
      Object.entries(value),
    );
  }

  return new Map();
};

class AnalysisContext {
  constructor(input) {
    if (
      !input ||
      typeof input !== 'object'
    ) {
      throw new AppError({
        code: 'INVALID_ANALYSIS_CONTEXT',
        message:
          'A valid analysis context is required.',
        statusCode: 400,
      });
    }

    this.reviewContext =
      input.reviewContext || input;

    this.files = Array.isArray(
      input.files,
    )
      ? input.files
      : [];

    this.parsedFiles =
      input.parsedFiles instanceof Map
        ? new Map(input.parsedFiles)
        : new Map();

    this.ast = new Map();

    this.symbolTables =
      normalizeMap(input.symbols);

    this.controlFlow =
      normalizeMap(input.controlFlow);

    this.dataFlow =
      normalizeMap(input.dataFlow);

    this.metrics =
      normalizeMap(input.metrics);

    this.callGraph =
      createEmptyCallGraph();

    this.taint =
      createEmptyTaint();

    this.initializeParsedFiles();

    this.initializeCallGraph(
      input.callGraph,
    );

    this.initializeTaint(
      input.taint,
    );
  }

  get symbols() {
    return this.symbolTables;
  }

  set symbols(value) {
    this.symbolTables =
      normalizeMap(value);
  }

  initializeParsedFiles() {
    for (
      const [
        filePath,
        parsed,
      ] of this.parsedFiles
    ) {
      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        this.ast.set(
          filePath,
          parsed.ast || null,
        );
      }
    }
  }

  initializeCallGraph(callGraph) {
    if (
      !callGraph ||
      typeof callGraph !== 'object'
    ) {
      return;
    }

    this.callGraph = {
      nodes:
        callGraph.nodes instanceof Map
          ? new Map(
              callGraph.nodes,
            )
          : new Map(
              Array.isArray(
                callGraph.nodes,
              )
                ? callGraph.nodes.map(
                    (
                      node,
                      index,
                    ) => [
                      node?.id ||
                        node?.name ||
                        String(index),
                      node,
                    ],
                  )
                : [],
            ),

      edges:
        Array.isArray(
          callGraph.edges,
        )
          ? [
              ...callGraph.edges,
            ]
          : [],
    };
  }

  initializeTaint(taint) {
    if (
      !taint ||
      typeof taint !== 'object'
    ) {
      return;
    }

    this.taint = {
      sources:
        Array.isArray(
          taint.sources,
        )
          ? [
              ...taint.sources,
            ]
          : [],

      sinks:
        Array.isArray(
          taint.sinks,
        )
          ? [
              ...taint.sinks,
            ]
          : [],

      sanitizers:
        Array.isArray(
          taint.sanitizers,
        )
          ? [
              ...taint.sanitizers,
            ]
          : [],

      flows:
        Array.isArray(
          taint.flows,
        )
          ? [
              ...taint.flows,
            ]
          : [],
    };
  }

  setAst(filePath, ast) {
    this.ast.set(
      filePath,
      ast,
    );

    return ast;
  }

  setAsts(asts) {
    this.ast =
      normalizeMap(asts);

    return this.ast;
  }

  setSymbolTable(
    filePath,
    symbolTable,
  ) {
    this.symbolTables.set(
      filePath,
      symbolTable,
    );

    return symbolTable;
  }

  setSymbolsMap(symbols) {
    this.symbolTables =
      normalizeMap(symbols);

    return this.symbolTables;
  }

  setControlFlow(
    filePath,
    graph,
  ) {
    this.controlFlow.set(
      filePath,
      graph,
    );

    return graph;
  }

  setControlFlowMap(graphs) {
    this.controlFlow =
      normalizeMap(graphs);

    return this.controlFlow;
  }

  setDataFlow(
    filePath,
    graph,
  ) {
    this.dataFlow.set(
      filePath,
      graph,
    );

    return graph;
  }

  setDataFlowMap(graphs) {
    this.dataFlow =
      normalizeMap(graphs);

    return this.dataFlow;
  }

  setMetrics(
    filePath,
    metrics,
  ) {
    this.metrics.set(
      filePath,
      metrics,
    );

    return metrics;
  }

  setMetricsMap(metrics) {
    this.metrics =
      normalizeMap(metrics);

    return this.metrics;
  }

  setCallGraph(callGraph) {
    this.initializeCallGraph(
      callGraph,
    );

    return this.callGraph;
  }

  setTaint(taint) {
    this.initializeTaint(taint);

    return this.taint;
  }

  getFileAnalysis(filePath) {
    const sources =
      this.taint.sources.filter(
        item =>
          item?.filePath ===
          filePath,
      );

    const sinks =
      this.taint.sinks.filter(
        item =>
          item?.filePath ===
          filePath,
      );

    const sanitizers =
      this.taint.sanitizers.filter(
        item =>
          item?.filePath ===
          filePath,
      );

    const flows =
      this.taint.flows.filter(
        item =>
          item?.filePath ===
          filePath,
      );

    return {
      ast:
        this.ast.get(filePath) ||
        null,

      symbols:
        this.symbolTables.get(
          filePath,
        ) || null,

      controlFlow:
        this.controlFlow.get(
          filePath,
        ) || null,

      dataFlow:
        this.dataFlow.get(
          filePath,
        ) || null,

      metrics:
        this.metrics.get(
          filePath,
        ) || null,

      taint: {
        sources,
        sinks,
        sanitizers,
        flows,
      },

      sources,
      sinks,
      sanitizers,
      flows,
    };
  }

  getAllFilePaths() {
    return [
      ...new Set([
        ...this.files
          .map(file => file?.path)
          .filter(Boolean),

        ...this.parsedFiles.keys(),
        ...this.ast.keys(),
        ...this.symbolTables.keys(),
        ...this.controlFlow.keys(),
        ...this.dataFlow.keys(),
        ...this.metrics.keys(),
      ]),
    ];
  }

  byFile() {
    const filePaths =
      this.getAllFilePaths();

    const result = new Map();

    for (
      const filePath of filePaths
    ) {
      result.set(
        filePath,
        this.getFileAnalysis(
          filePath,
        ),
      );
    }

    return result;
  }

  clear() {
    this.files = [];

    this.parsedFiles.clear();
    this.ast.clear();
    this.symbolTables.clear();
    this.controlFlow.clear();
    this.dataFlow.clear();
    this.metrics.clear();

    this.callGraph =
      createEmptyCallGraph();

    this.taint =
      createEmptyTaint();
  }
}

const createAnalysisContext = input =>
  new AnalysisContext(input);

export {
  AnalysisContext,
  createAnalysisContext,
};

export default AnalysisContext;