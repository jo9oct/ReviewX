import {
  CFGNode,
  CFGEdge,
  CFG_EDGE_KINDS,
  ControlFlowGraph,
} from './cfgNode.js';

const assertGraph = (graph) => {
  if (!(graph instanceof ControlFlowGraph)) {
    throw new TypeError(
      'Expected a ControlFlowGraph instance.',
    );
  }
};

const assertNode = (node) => {
  if (!(node instanceof CFGNode)) {
    throw new TypeError(
      'Expected a CFGNode instance.',
    );
  }
};

const getReachableNodes = (
  graph,
  startNode = graph?.entry,
) => {
  assertGraph(graph);

  if (!(startNode instanceof CFGNode)) {
    return [];
  }

  const visited = new Set();
  const queue = [startNode];
  const reachable = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || visited.has(current.id)) {
      continue;
    }

    visited.add(current.id);
    reachable.push(current);

    for (const edge of current.outgoing) {
      if (
        edge?.target &&
        !visited.has(edge.target.id)
      ) {
        queue.push(edge.target);
      }
    }
  }

  return reachable;
};

const getUnreachableNodes = (
  graph,
  startNode = graph?.entry,
) => {
  assertGraph(graph);

  const reachableIds = new Set(
    getReachableNodes(
      graph,
      startNode,
    ).map(
      (node) => node.id,
    ),
  );

  return graph
    .getNodes()
    .filter(
      (node) =>
        !reachableIds.has(node.id),
    );
};

const isReachable = (
  graph,
  targetNode,
  startNode = graph?.entry,
) => {
  assertGraph(graph);
  assertNode(targetNode);

  return getReachableNodes(
    graph,
    startNode,
  ).some(
    (node) =>
      node.id === targetNode.id,
  );
};

const hasPath = (
  graph,
  startNode,
  targetNode,
) => {
  assertGraph(graph);
  assertNode(startNode);
  assertNode(targetNode);

  return isReachable(
    graph,
    targetNode,
    startNode,
  );
};

const getPath = (
  graph,
  startNode,
  targetNode,
) => {
  assertGraph(graph);
  assertNode(startNode);
  assertNode(targetNode);

  if (startNode.id === targetNode.id) {
    return [startNode];
  }

  const visited = new Set();
  const queue = [
    {
      node: startNode,
      path: [startNode],
    },
  ];

  while (queue.length > 0) {
    const current =
      queue.shift();

    if (!current) {
      continue;
    }

    if (
      visited.has(
        current.node.id,
      )
    ) {
      continue;
    }

    visited.add(
      current.node.id,
    );

    for (
      const edge of current.node.outgoing
    ) {
      const nextNode =
        edge?.target;

      if (!nextNode) {
        continue;
      }

      const nextPath = [
        ...current.path,
        nextNode,
      ];

      if (
        nextNode.id ===
        targetNode.id
      ) {
        return nextPath;
      }

      if (
        !visited.has(nextNode.id)
      ) {
        queue.push({
          node: nextNode,
          path: nextPath,
        });
      }
    }
  }

  return [];
};

const getIncomingEdges = (
  node,
) => {
  assertNode(node);

  return [
    ...node.incoming,
  ];
};

const getOutgoingEdges = (
  node,
) => {
  assertNode(node);

  return [
    ...node.outgoing,
  ];
};

const getEdgesByKind = (
  graph,
  kind,
) => {
  assertGraph(graph);

  if (
    typeof kind !== 'string' ||
    !kind
  ) {
    return [];
  }

  return graph
    .getEdges()
    .filter(
      (edge) =>
        edge.kind === kind,
    );
};

const getConditionalEdges = (
  graph,
) => {
  assertGraph(graph);

  return graph
    .getEdges()
    .filter(
      (edge) =>
        edge.kind ===
          CFG_EDGE_KINDS.TRUE ||
        edge.kind ===
          CFG_EDGE_KINDS.FALSE,
    );
};

const getTerminalNodes = (
  graph,
) => {
  assertGraph(graph);

  return graph
    .getNodes()
    .filter(
      (node) =>
        node.outgoing.length === 0,
    );
};

const getBranchNodes = (
  graph,
) => {
  assertGraph(graph);

  return graph
    .getNodes()
    .filter(
      (node) =>
        node.outgoing.length > 1,
    );
};

const calculateCyclomaticComplexity = (
  graph,
) => {
  assertGraph(graph);

  const nodeCount =
    graph.getNodes().length;

  const edgeCount =
    graph.getEdges().length;

  if (nodeCount === 0) {
    return 0;
  }

  const connectedComponents = 1;

  return (
    edgeCount -
    nodeCount +
    2 * connectedComponents
  );
};

const calculateBranchComplexity = (
  graph,
) => {
  assertGraph(graph);

  const branchNodes =
    getBranchNodes(graph);

  return (
    branchNodes.length + 1
  );
};

const getDeadEndNodes = (
  graph,
) => {
  assertGraph(graph);

  return graph
    .getNodes()
    .filter(
      (node) =>
        node !== graph.exit &&
        node.outgoing.length === 0,
    );
};

const getEntryReachabilityReport = (
  graph,
) => {
  assertGraph(graph);

  const reachable =
    getReachableNodes(graph);

  const unreachable =
    getUnreachableNodes(graph);

  const deadEnds =
    getDeadEndNodes(graph);

  return {
    entryId:
      graph.entry?.id || null,
    exitId:
      graph.exit?.id || null,
    reachableNodeIds:
      reachable.map(
        (node) => node.id,
      ),
    unreachableNodeIds:
      unreachable.map(
        (node) => node.id,
      ),
    deadEndNodeIds:
      deadEnds.map(
        (node) => node.id,
      ),
    reachableCount:
      reachable.length,
    unreachableCount:
      unreachable.length,
    deadEndCount:
      deadEnds.length,
  };
};

const validateGraph = (
  graph,
) => {
  assertGraph(graph);

  const errors = [];

  if (!graph.entry) {
    errors.push(
      'CFG entry node is missing.',
    );
  }

  if (!graph.exit) {
    errors.push(
      'CFG exit node is missing.',
    );
  }

  for (const node of graph.getNodes()) {
    for (const edge of node.outgoing) {
      if (!(edge instanceof CFGEdge)) {
        errors.push(
          `Node ${node.id} contains an invalid outgoing edge.`,
        );
        continue;
      }

      if (
        edge.source.id !==
        node.id
      ) {
        errors.push(
          `Edge ${edge.id} has an invalid source relationship.`,
        );
      }

      if (
        !graph.getNode(
          edge.target.id,
        )
      ) {
        errors.push(
          `Edge ${edge.id} points to a node that is not registered in the graph.`,
        );
      }
    }

    for (const edge of node.incoming) {
      if (!(edge instanceof CFGEdge)) {
        errors.push(
          `Node ${node.id} contains an invalid incoming edge.`,
        );
        continue;
      }

      if (
        edge.target.id !==
        node.id
      ) {
        errors.push(
          `Edge ${edge.id} has an invalid target relationship.`,
        );
      }

      if (
        !graph.getNode(
          edge.source.id,
        )
      ) {
        errors.push(
          `Edge ${edge.id} comes from a node that is not registered in the graph.`,
        );
      }
    }
  }

  for (const edge of graph.getEdges()) {
    if (
      !graph.getNode(
        edge.source.id,
      )
    ) {
      errors.push(
        `Edge ${edge.id} has an unregistered source node.`,
      );
    }

    if (
      !graph.getNode(
        edge.target.id,
      )
    ) {
      errors.push(
        `Edge ${edge.id} has an unregistered target node.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const summarizeGraph = (
  graph,
) => {
  assertGraph(graph);

  const nodes =
    graph.getNodes();

  const edges =
    graph.getEdges();

  const unreachable =
    getUnreachableNodes(graph);

  const branches =
    getBranchNodes(graph);

  return {
    filePath:
      graph.filePath,
    language:
      graph.language,
    functionName:
      graph.functionName,

    nodeCount:
      nodes.length,

    edgeCount:
      edges.length,

    entryId:
      graph.entry?.id || null,

    exitId:
      graph.exit?.id || null,

    reachableCount:
      nodes.length -
      unreachable.length,

    unreachableCount:
      unreachable.length,

    branchCount:
      branches.length,

    cyclomaticComplexity:
      calculateCyclomaticComplexity(
        graph,
      ),

    branchComplexity:
      calculateBranchComplexity(
        graph,
      ),

    validation:
      validateGraph(graph),
  };
};

export {
  getReachableNodes,
  getUnreachableNodes,
  isReachable,
  hasPath,
  getPath,
  getIncomingEdges,
  getOutgoingEdges,
  getEdgesByKind,
  getConditionalEdges,
  getTerminalNodes,
  getBranchNodes,
  calculateCyclomaticComplexity,
  calculateBranchComplexity,
  getDeadEndNodes,
  getEntryReachabilityReport,
  validateGraph,
  summarizeGraph,
};

export default summarizeGraph;