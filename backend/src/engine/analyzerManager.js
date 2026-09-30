import { SymbolTable } from '../symbols/symbolTable.js';

import { buildControlFlowGraph } from '../analysis/controlFlow.js';
import { buildDataFlowGraph } from '../analysis/dataFlow.js';
import { buildCallGraph } from '../analysis/callGraph.js';
import { buildTaintAnalysis } from '../analysis/taint.js';
import { calculateCodeMetrics } from '../analysis/codeMetrics.js';

import { ruleRegistry } from '../rules/ruleRegistry.js';
import { RuleEngine } from '../rules/ruleEngine.js';

const createSymbolTable = (file, ast) => {
  const symbolTable = SymbolTable();

  if (
    symbolTable &&
    typeof symbolTable.build === 'function'
  ) {
    symbolTable.build({
      file,
      ast,
    });
  }

  return symbolTable;
};

const extractSymbols = symbolTable => {
  if (
    !symbolTable ||
    typeof symbolTable !== 'object'
  ) {
    return [];
  }

  if (
    typeof symbolTable.getSymbols === 'function'
  ) {
    const symbols = symbolTable.getSymbols();

    return Array.isArray(symbols)
      ? symbols
      : [];
  }

  if (Array.isArray(symbolTable.symbols)) {
    return symbolTable.symbols;
  }

  return [];
};

const extractGraph = (
  builder,
  fallback
) => {
  if (
    !builder ||
    typeof builder !== 'object'
  ) {
    return fallback;
  }

  const nodes =
    typeof builder.getNodes === 'function'
      ? builder.getNodes()
      : builder.nodes instanceof Map
        ? [...builder.nodes.values()]
        : Array.isArray(builder.nodes)
          ? builder.nodes
          : [];

  const edges =
    typeof builder.getEdges === 'function'
      ? builder.getEdges()
      : Array.isArray(builder.edges)
        ? builder.edges
        : [];

  return {
    nodes,
    edges,
  };
};

const extractTaint = builder => {
  if (
    !builder ||
    typeof builder !== 'object'
  ) {
    return {
      sources: [],
      sinks: [],
      sanitizers: [],
      flows: [],
    };
  }

  const sources =
    typeof builder.getSources === 'function'
      ? builder.getSources()
      : Array.isArray(builder.sources)
        ? builder.sources
        : [];

  const sinks =
    typeof builder.getSinks === 'function'
      ? builder.getSinks()
      : Array.isArray(builder.sinks)
        ? builder.sinks
        : [];

  const sanitizers =
    typeof builder.getSanitizers === 'function'
      ? builder.getSanitizers()
      : Array.isArray(builder.sanitizers)
        ? builder.sanitizers
        : [];

  const flows =
    typeof builder.getFlows === 'function'
      ? builder.getFlows()
      : Array.isArray(builder.flows)
        ? builder.flows
        : [];

  return {
    sources,
    sinks,
    sanitizers,
    flows,
  };
};

const buildAnalysisArtifacts = (
  files,
  parsedFiles,
  {
    advancedAnalysis = false,
  } = {}
) => {
  if (!Array.isArray(files)) {
    throw new TypeError(
      'Analysis files must be an array.'
    );
  }

  if (!(parsedFiles instanceof Map)) {
    throw new TypeError(
      'Parsed files must be provided as a Map.'
    );
  }

  const symbols = new Map();
  const controlFlow = new Map();
  const dataFlow = new Map();
  const metrics = new Map();

  const callGraph = {
    nodes: new Map(),
    edges: [],
  };

  const taint = {
    sources: [],
    sinks: [],
    sanitizers: [],
    flows: [],
  };

  for (const file of files) {
    if (
      !file ||
      typeof file !== 'object' ||
      typeof file.path !== 'string'
    ) {
      continue;
    }

    const parsed = parsedFiles.get(
      file.path
    );

    if (!parsed) {
      continue;
    }

    const ast = parsed.ast || null;

    /*
     * Code metrics remain part of the baseline
     * review pipeline.
     *
     * They are lightweight and are required by
     * normal review reporting/scoring.
     */
    const fileMetrics =
      typeof calculateCodeMetrics ===
      'function'
        ? calculateCodeMetrics(
            file.content
          )
        : {
            lines: 0,
            nonEmptyLines: 0,
            comments: 0,
            blankLines: 0,
            commentRatio: 0,
          };

    metrics.set(
      file.path,
      fileMetrics
    );

    /*
     * Advanced analysis is explicitly opt-in.
     *
     * When advancedAnalysis is false, do not build:
     *
     * - symbol tables
     * - control-flow graphs
     * - data-flow graphs
     * - call graphs
     * - taint analysis
     *
     * Empty structures are returned so downstream
     * components can safely consume the same contract.
     */
    if (!advancedAnalysis) {
      continue;
    }

    const symbolTable =
      createSymbolTable(
        file,
        ast
      );

    const fileSymbols =
      extractSymbols(
        symbolTable
      );

    symbols.set(
      file.path,
      fileSymbols
    );

    const controlFlowBuilder =
      typeof buildControlFlowGraph ===
      'function'
        ? buildControlFlowGraph({
            file,
            ast,
            symbols: symbolTable,
          })
        : null;

    const controlFlowGraph =
      extractGraph(
        controlFlowBuilder,
        {
          nodes: [],
          edges: [],
        }
      );

    controlFlow.set(
      file.path,
      controlFlowGraph
    );

    const dataFlowBuilder =
      typeof buildDataFlowGraph ===
      'function'
        ? buildDataFlowGraph({
            file,
            ast,
            symbols: symbolTable,
            controlFlow:
              controlFlowGraph,
          })
        : null;

    const dataFlowGraph =
      extractGraph(
        dataFlowBuilder,
        {
          nodes: [],
          edges: [],
        }
      );

    dataFlow.set(
      file.path,
      dataFlowGraph
    );

    if (
      typeof buildCallGraph ===
      'function'
    ) {
      const callGraphBuilder =
        buildCallGraph({
          file,
          ast,
          symbols: symbolTable,
        });

      const fileCallGraph =
        extractGraph(
          callGraphBuilder,
          {
            nodes: [],
            edges: [],
          }
        );

      for (
        const node of fileCallGraph.nodes
      ) {
        if (
          node &&
          typeof node === 'object'
        ) {
          const nodeId =
            node.id ||
            node.name ||
            `${file.path}:node:${callGraph.nodes.size}`;

          callGraph.nodes.set(
            nodeId,
            node
          );
        }
      }

      for (
        const edge of fileCallGraph.edges
      ) {
        if (
          edge &&
          typeof edge === 'object'
        ) {
          callGraph.edges.push(
            edge
          );
        }
      }
    }

    if (
      typeof buildTaintAnalysis ===
      'function'
    ) {
      const taintBuilder =
        buildTaintAnalysis({
          file,
          ast,
          symbols: symbolTable,
          dataFlow:
            dataFlowGraph,
        });

      const fileTaint =
        extractTaint(
          taintBuilder
        );

      taint.sources.push(
        ...fileTaint.sources
      );

      taint.sinks.push(
        ...fileTaint.sinks
      );

      taint.sanitizers.push(
        ...fileTaint.sanitizers
      );

      taint.flows.push(
        ...fileTaint.flows
      );
    }
  }

  return {
    symbols,
    controlFlow,
    dataFlow,
    metrics,
    callGraph,
    taint,
  };
};

const runStaticAnalyzers = ({
  files,
  analysisByFile,
  companyRules = [],
}) => {
  const ruleEngine =
    new RuleEngine(
      ruleRegistry
    );

  const allViolations =
    ruleEngine.evaluate({
      files,
      analysisByFile,
    });

  const bugs =
    allViolations.filter(
      violation =>
        violation.category ===
        'bug'
    );

  const security =
    allViolations.filter(
      violation =>
        violation.category ===
        'security'
    );

  const quality =
    allViolations.filter(
      violation =>
        violation.category ===
        'quality'
    );

  const performance =
    allViolations.filter(
      violation =>
        violation.category ===
        'performance'
    );

  const company =
    Array.isArray(companyRules)
      ? companyRules.filter(
          violation =>
            violation &&
            typeof violation ===
              'object'
        )
      : [];

  return {
    bugs,
    security,
    quality,
    performance,
    company,
    findings: [
      ...security,
      ...bugs,
      ...quality,
      ...performance,
      ...company,
    ],
  };
};

export {
  buildAnalysisArtifacts,
  runStaticAnalyzers,
};

export default {
  buildAnalysisArtifacts,
  runStaticAnalyzers,
};