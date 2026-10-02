import {
  getNodeDefinitions,
} from './definitions.js';

import {
  getNodeUses,
} from './uses.js';

const isGraphNode = (node) => {
  return Boolean(
    node &&
    typeof node === 'object' &&
    typeof node.id === 'string',
  );
};

const getGraphNodes = (graph) => {
  if (
    !graph ||
    typeof graph.getNodes !== 'function'
  ) {
    return [];
  }

  const nodes = graph.getNodes();

  if (Array.isArray(nodes)) {
    return nodes;
  }

  if (
    nodes instanceof Map
  ) {
    return [
      ...nodes.values(),
    ];
  }

  return [];
};

const getSourceAstNode = (
  node,
) => {
  /*
   * CFGNode.astNode intentionally stores
   * normalized source-location information.
   *
   * The original Tree-sitter node is preserved
   * in metadata.sourceNode.
   */
  return (
    node?.metadata?.sourceNode ||
    null
  );
};

const analyzeDataFlow = ({
  graph,
  filePath = null,
  language = null,
  functionName = null,
} = {}) => {
  if (!graph) {
    return {
      filePath,
      language,
      functionName,
      nodeCount: 0,
      definitionCount: 0,
      useCount: 0,
      nodes: [],
    };
  }

  const graphNodes =
    getGraphNodes(graph)
      .filter(isGraphNode);

  const analyzedNodes = [];

  let definitionCount = 0;
  let useCount = 0;

  for (const node of graphNodes) {
    const astNode =
      getSourceAstNode(node);

    const definitions =
      getNodeDefinitions(astNode);

    const uses =
      getNodeUses(astNode);

    definitionCount +=
      definitions.length;

    useCount +=
      uses.length;

    analyzedNodes.push({
      nodeId: node.id,
      nodeKind: node.kind,
      label: node.label || null,
      definitions,
      uses,
    });
  }

  return {
    filePath:
      filePath ??
      graph.filePath ??
      null,

    language:
      language ??
      graph.language ??
      null,

    functionName:
      functionName ??
      graph.functionName ??
      null,

    nodeCount:
      graphNodes.length,

    definitionCount,

    useCount,

    nodes: analyzedNodes,
  };
};

const getDefinitions = (
  analysis,
) => {
  return (analysis?.nodes || [])
    .flatMap(
      (node) =>
        node.definitions || [],
    );
};

const getUses = (
  analysis,
) => {
  return (analysis?.nodes || [])
    .flatMap(
      (node) =>
        node.uses || [],
    );
};

export {
  analyzeDataFlow,
  getDefinitions,
  getUses,
};

export default analyzeDataFlow;