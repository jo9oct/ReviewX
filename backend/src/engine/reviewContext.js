import { AppError } from '../utils/errors.js';

class ReviewContext {
  constructor({
    reviewId = null,
    projectId = null,
    source,
  } = {}) {
    if (!source || typeof source !== 'object') {
      throw new AppError({
        code: 'REVIEW_SOURCE_REQUIRED',
        message:
          'A normalized source is required for review analysis.',
        statusCode: 400,
      });
    }

    this.reviewId = reviewId;
    this.projectId = projectId;
    this.source = source;

    this.files = new Map();
    this.languages = new Map();
    this.parsers = new Map();
    this.ast = new Map();
    this.symbols = new Map();
    this.controlFlow = new Map();
    this.dataFlow = new Map();

    this.callGraph = {
      nodes: new Map(),
      edges: [],
    };

    this.taint = {
      sources: [],
      sinks: [],
      sanitizers: [],
      flows: [],
    };

    this.metrics = new Map();

    this.metadata = {
      createdAt: new Date(),
      completedAt: null,
      analysis: {},
    };
  }

  addFile(file) {
    if (!file?.path) {
      throw new AppError({
        code: 'INVALID_REVIEW_FILE',
        message:
          'A review file must contain a path.',
        statusCode: 400,
      });
    }

    this.files.set(file.path, file);

    if (file.language) {
      this.setLanguage(
        file.path,
        file.language,
      );
    }

    return file;
  }

  addFiles(files) {
    if (!Array.isArray(files)) {
      throw new AppError({
        code: 'INVALID_REVIEW_FILES',
        message:
          'Review files must be provided as an array.',
        statusCode: 400,
      });
    }

    for (const file of files) {
      this.addFile(file);
    }

    return this.files;
  }

  setLanguage(filePath, language) {
    if (!filePath) {
      return;
    }

    this.languages.set(
      filePath,
      language,
    );
  }

  setParser(filePath, parser) {
    if (!filePath) {
      return;
    }

    this.parsers.set(
      filePath,
      parser,
    );
  }

  setParsers(parsers) {
    if (!(parsers instanceof Map)) {
      return;
    }

    for (const [
      filePath,
      parser,
    ] of parsers.entries()) {
      this.setParser(
        filePath,
        parser,
      );
    }
  }

  setAst(filePath, ast) {
    if (!filePath) {
      return;
    }

    this.ast.set(
      filePath,
      ast,
    );
  }

  setAsts(asts) {
    if (!(asts instanceof Map)) {
      return;
    }

    for (const [
      filePath,
      ast,
    ] of asts.entries()) {
      this.setAst(
        filePath,
        ast,
      );
    }
  }

  setSymbols(filePath, symbols) {
    if (!filePath) {
      return;
    }

    this.symbols.set(
      filePath,
      symbols,
    );
  }

  setSymbolsMap(symbols) {
    if (!(symbols instanceof Map)) {
      return;
    }

    for (const [
      filePath,
      value,
    ] of symbols.entries()) {
      this.setSymbols(
        filePath,
        value,
      );
    }
  }

  setControlFlow(filePath, graph) {
    if (!filePath) {
      return;
    }

    this.controlFlow.set(
      filePath,
      graph,
    );
  }

  setControlFlowMap(controlFlow) {
    if (!(controlFlow instanceof Map)) {
      return;
    }

    for (const [
      filePath,
      graph,
    ] of controlFlow.entries()) {
      this.setControlFlow(
        filePath,
        graph,
      );
    }
  }

  setDataFlow(filePath, graph) {
    if (!filePath) {
      return;
    }

    this.dataFlow.set(
      filePath,
      graph,
    );
  }

  setDataFlowMap(dataFlow) {
    if (!(dataFlow instanceof Map)) {
      return;
    }

    for (const [
      filePath,
      graph,
    ] of dataFlow.entries()) {
      this.setDataFlow(
        filePath,
        graph,
      );
    }
  }

  setCallGraph(callGraph) {
    if (
      !callGraph ||
      typeof callGraph !== 'object'
    ) {
      return;
    }

    this.callGraph = {
      nodes:
        callGraph.nodes instanceof Map
          ? callGraph.nodes
          : new Map(),

      edges:
        Array.isArray(callGraph.edges)
          ? callGraph.edges
          : [],
    };
  }

  setTaint(taint) {
    if (
      !taint ||
      typeof taint !== 'object'
    ) {
      return;
    }

    this.taint = {
      sources:
        Array.isArray(taint.sources)
          ? taint.sources
          : [],

      sinks:
        Array.isArray(taint.sinks)
          ? taint.sinks
          : [],

      sanitizers:
        Array.isArray(
          taint.sanitizers,
        )
          ? taint.sanitizers
          : [],

      flows:
        Array.isArray(taint.flows)
          ? taint.flows
          : [],
    };
  }

  setMetrics(filePath, metrics) {
    if (!filePath) {
      return;
    }

    this.metrics.set(
      filePath,
      metrics,
    );
  }

  setMetricsMap(metrics) {
    if (!(metrics instanceof Map)) {
      return;
    }

    for (const [
      filePath,
      value,
    ] of metrics.entries()) {
      this.setMetrics(
        filePath,
        value,
      );
    }
  }

  setMetadata(metadata = {}) {
    if (
      !metadata ||
      typeof metadata !== 'object'
    ) {
      return;
    }

    this.metadata.analysis = {
      ...this.metadata.analysis,
      ...metadata,
    };
  }

  complete() {
    this.metadata.completedAt =
      new Date();
  }

  getFile(filePath) {
    return (
      this.files.get(filePath) ||
      null
    );
  }

  getSummary() {
    return {
      reviewId: this.reviewId,

      projectId: this.projectId,

      files: this.files.size,

      languages: [
        ...new Set(
          this.languages.values(),
        ),
      ],

      astFiles: this.ast.size,

      symbolFiles:
        this.symbols.size,

      controlFlowFiles:
        this.controlFlow.size,

      dataFlowFiles:
        this.dataFlow.size,

      metricsFiles:
        this.metrics.size,

      callGraphNodes:
        this.callGraph.nodes.size,

      callGraphEdges:
        this.callGraph.edges.length,

      taintSources:
        this.taint.sources.length,

      taintSinks:
        this.taint.sinks.length,

      taintFlows:
        this.taint.flows.length,
    };
  }
}

const createReviewContext = ({
  reviewId = null,
  projectId = null,
  source,
} = {}) =>
  new ReviewContext({
    reviewId,
    projectId,
    source,
  });

export {
  ReviewContext,
  createReviewContext,
};

export default ReviewContext;