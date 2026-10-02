const isGraphNode = (graph, node) => {
  if (!graph || !node) {
    return false;
  }

  return graph.getNodes().includes(node);
};

const getReachableNodes = (graph) => {
  if (!graph || !graph.entry) {
    return new Set();
  }

  const reachable = new Set();
  const queue = [graph.entry];

  while (queue.length > 0) {
    const node = queue.shift();

    if (reachable.has(node)) {
      continue;
    }

    reachable.add(node);

    for (const successor of graph.getSuccessors(node)) {
      if (!reachable.has(successor)) {
        queue.push(successor);
      }
    }
  }

  return reachable;
};

const getUnreachableNodes = (graph) => {
  if (!graph) {
    return [];
  }

  const reachable = getReachableNodes(graph);

  return graph
    .getNodes()
    .filter((node) => !reachable.has(node));
};

const analyzeUnreachableCode = (graph) => {
  if (!graph) {
    throw new TypeError('CFG graph is required');
  }

  const unreachableNodes = getUnreachableNodes(graph);

  return {
    count: unreachableNodes.length,

    nodes: unreachableNodes.map((node) => ({
      id: node.id,
      kind: node.kind ?? null,
      label: node.label ?? null,
      text: node.text ?? null,
      start: node.start ?? null,
      end: node.end ?? null,
    })),
  };
};

const getBranchNodes = (graph) => {
  if (!graph) {
    return [];
  }

  return graph
    .getNodes()
    .filter((node) => graph.getSuccessors(node).length > 1);
};

const getBranchCount = (graph) => {
  return getBranchNodes(graph).length;
};

/**
 * Returns source-level decision nodes.
 *
 * A decision node is explicitly represented by the CFG
 * builder as a condition, loop, or switch node.
 */
const getDecisionNodes = (graph) => {
  if (!graph) {
    return [];
  }

  const decisionKinds = new Set([
    'condition',
    'loop',
    'switch',
  ]);

  return graph
    .getNodes()
    .filter((node) => decisionKinds.has(node.kind));
};

const getBranchEdges = (graph, node) => {
  if (!graph || !node || !isGraphNode(graph, node)) {
    return [];
  }

  return graph
    .getEdges()
    .filter((edge) => edge.source === node);
};

const getBranchEdgeType = (edge) => {
  if (!edge) {
    return 'unknown';
  }

  const supportedTypes = new Set([
    'true',
    'false',
    'case',
    'default',
    'loop',
    'exception',
    'break',
    'continue',
    'throw',
    'return',
    'normal',
  ]);

  if (supportedTypes.has(edge.kind)) {
    return edge.kind;
  }

  return 'unknown';
};

const getDecisionType = (node) => {
  if (!node) {
    return 'unknown';
  }

  if (node.kind === 'condition') {
    return 'condition';
  }

  if (node.kind === 'loop') {
    return 'loop';
  }

  if (node.kind === 'switch') {
    return 'switch';
  }

  return 'unknown';
};

const getExpectedBranchCount = (node, branchEdges) => {
  if (!node) {
    return 0;
  }

  if (node.kind === 'condition') {
    return 2;
  }

  if (node.kind === 'loop') {
    return 2;
  }

  if (node.kind === 'switch') {
    return branchEdges.length;
  }

  return branchEdges.length;
};

const analyzeBranchNode = (graph, node) => {
  if (!graph) {
    throw new TypeError('CFG graph is required');
  }

  if (!node || !isGraphNode(graph, node)) {
    throw new TypeError('CFG decision node must belong to the graph');
  }

  const branchEdges = getBranchEdges(graph, node);
  const decisionType = getDecisionType(node);

  const branches = branchEdges.map((edge) => ({
    edgeId: edge.id,
    edgeKind: edge.kind ?? null,
    branchType: getBranchEdgeType(edge),
    targetId: edge.target?.id ?? null,
    targetKind: edge.target?.kind ?? null,
    targetLabel: edge.target?.label ?? null,
  }));

  const branchTypes = new Set(
    branches.map((branch) => branch.branchType),
  );

  let structurallyComplete = false;

  if (decisionType === 'condition') {
    structurallyComplete =
      branchTypes.has('true') &&
      branchTypes.has('false');
  } else if (decisionType === 'loop') {
    structurallyComplete =
      branchTypes.has('true') &&
      branchTypes.has('false');
  } else if (decisionType === 'switch') {
    structurallyComplete =
      branchTypes.has('case') ||
      branchTypes.has('default');
  }

  return {
    nodeId: node.id,
    kind: node.kind ?? null,
    decisionType,
    label: node.label ?? null,
    text: node.text ?? null,

    branchCount: branchEdges.length,

    branches,

    expectedBranchCount: getExpectedBranchCount(
      node,
      branchEdges,
    ),

    hasTrueBranch: branchTypes.has('true'),
    hasFalseBranch: branchTypes.has('false'),
    hasCaseBranches: branchTypes.has('case'),
    hasDefaultBranch: branchTypes.has('default'),
    hasLoopBranch: branchTypes.has('loop'),
    hasExceptionBranch: branchTypes.has('exception'),

    structurallyComplete,
  };
};

const analyzeBranchStructure = (graph) => {
  if (!graph) {
    throw new TypeError('CFG graph is required');
  }

  const decisionNodes = getDecisionNodes(graph);

  const decisions = decisionNodes.map((node) =>
    analyzeBranchNode(graph, node),
  );

  const branchEdgeCount = decisions.reduce(
    (total, decision) => total + decision.branchCount,
    0,
  );

  return {
    decisionCount: decisionNodes.length,
    branchEdgeCount,
    decisions,
  };
};

const getCyclomaticComplexity = (graph) => {
  if (!graph) {
    return 0;
  }

  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    return 0;
  }

  const nodeSet = new Set(nodes);
  const visited = new Set();
  let components = 0;

  for (const startNode of nodes) {
    if (visited.has(startNode)) {
      continue;
    }

    components += 1;

    const queue = [startNode];

    while (queue.length > 0) {
      const node = queue.shift();

      if (visited.has(node)) {
        continue;
      }

      visited.add(node);

      for (const successor of graph.getSuccessors(node)) {
        if (nodeSet.has(successor) && !visited.has(successor)) {
          queue.push(successor);
        }
      }

      for (const predecessor of graph.getPredecessors(node)) {
        if (nodeSet.has(predecessor) && !visited.has(predecessor)) {
          queue.push(predecessor);
        }
      }
    }
  }

  return Math.max(
    1,
    edges.length - nodes.length + (2 * components),
  );
};

const validateGraph = (graph) => {
  const errors = [];

  if (!graph) {
    return {
      valid: false,
      errors: ['CFG graph is required'],
    };
  }

  const nodes = graph.getNodes();
  const edges = graph.getEdges();
  const nodeSet = new Set(nodes);

  if (!graph.entry) {
    errors.push('CFG entry node is missing');
  } else if (!nodeSet.has(graph.entry)) {
    errors.push('CFG entry node does not belong to the graph');
  }

  if (!graph.exit) {
    errors.push('CFG exit node is missing');
  } else if (!nodeSet.has(graph.exit)) {
    errors.push('CFG exit node does not belong to the graph');
  }

  const nodeIds = new Set();

  for (const node of nodes) {
    if (!node || !node.id) {
      errors.push('CFG contains a node without an id');
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate CFG node id: ${node.id}`);
    }

    nodeIds.add(node.id);
  }

  const edgeIds = new Set();

  for (const edge of edges) {
    if (!edge || !edge.id) {
      errors.push('CFG contains an edge without an id');
      continue;
    }

    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate CFG edge id: ${edge.id}`);
    }

    edgeIds.add(edge.id);

    if (!isGraphNode(graph, edge.source)) {
      errors.push(`CFG edge ${edge.id} has an invalid source`);
    }

    if (!isGraphNode(graph, edge.target)) {
      errors.push(`CFG edge ${edge.id} has an invalid target`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const getNodeCountsByKind = (graph) => {
  const counts = {};

  if (!graph) {
    return counts;
  }

  for (const node of graph.getNodes()) {
    const kind = node.kind || 'unknown';
    counts[kind] = (counts[kind] || 0) + 1;
  }

  return counts;
};

const getEdgeCountsByKind = (graph) => {
  const counts = {};

  if (!graph) {
    return counts;
  }

  for (const edge of graph.getEdges()) {
    const kind = edge.kind || 'unknown';
    counts[kind] = (counts[kind] || 0) + 1;
  }

  return counts;
};

/**
 * Enumerates bounded execution paths through the CFG.
 *
 * This is structural path analysis only.
 * It does not execute code and does not determine
 * whether a path is actually feasible for concrete input.
 */
const analyzePaths = (
  graph,
  {
    maxPaths = 100,
    maxPathLength = 100,
  } = {},
) => {
  if (!graph) {
    throw new TypeError('CFG graph is required');
  }

  if (!Number.isInteger(maxPaths) || maxPaths < 1) {
    throw new TypeError('maxPaths must be a positive integer');
  }

  if (
    !Number.isInteger(maxPathLength) ||
    maxPathLength < 1
  ) {
    throw new TypeError(
      'maxPathLength must be a positive integer',
    );
  }

  if (!graph.entry) {
    return {
      count: 0,
      completeCount: 0,
      truncatedCount: 0,
      paths: [],
      maxPaths,
      maxPathLength,
    };
  }

  const paths = [];

  const stack = [
    {
      node: graph.entry,
      nodePath: [graph.entry],
      edgePath: [],
      visitedEdges: new Set(),
      truncated: false,
    },
  ];

  while (stack.length > 0 && paths.length < maxPaths) {
    const state = stack.pop();

    const {
      node,
      nodePath,
      edgePath,
      visitedEdges,
    } = state;

    if (node === graph.exit) {
      paths.push({
        nodeIds: nodePath.map((item) => item.id),
        edgeIds: edgePath.map((item) => item.id),
        terminalNodeId: node.id,
        terminalNodeKind: node.kind ?? null,
        complete: true,
        truncated: false,
      });

      continue;
    }

    if (nodePath.length >= maxPathLength) {
      paths.push({
        nodeIds: nodePath.map((item) => item.id),
        edgeIds: edgePath.map((item) => item.id),
        terminalNodeId: node.id,
        terminalNodeKind: node.kind ?? null,
        complete: false,
        truncated: true,
      });

      continue;
    }

    const outgoingEdges = graph
      .getEdges()
      .filter((edge) => edge.source === node);

    if (outgoingEdges.length === 0) {
      paths.push({
        nodeIds: nodePath.map((item) => item.id),
        edgeIds: edgePath.map((item) => item.id),
        terminalNodeId: node.id,
        terminalNodeKind: node.kind ?? null,
        complete: false,
        truncated: false,
      });

      continue;
    }

    for (
      let index = outgoingEdges.length - 1;
      index >= 0;
      index -= 1
    ) {
      if (paths.length >= maxPaths) {
        break;
      }

      const edge = outgoingEdges[index];

      /*
       * Prevent infinite traversal through CFG cycles.
       *
       * A path may revisit a node through a different edge,
       * but the same edge cannot be traversed repeatedly.
       */
      if (visitedEdges.has(edge)) {
        continue;
      }

      const nextNode = edge.target;

      if (!nextNode || !isGraphNode(graph, nextNode)) {
        continue;
      }

      const nextVisitedEdges = new Set(visitedEdges);
      nextVisitedEdges.add(edge);

      stack.push({
        node: nextNode,
        nodePath: [...nodePath, nextNode],
        edgePath: [...edgePath, edge],
        visitedEdges: nextVisitedEdges,
        truncated: false,
      });
    }
  }

  const truncatedCount = paths.filter(
    (path) => path.truncated,
  ).length;

  const completeCount = paths.filter(
    (path) => path.complete,
  ).length;

  return {
    count: paths.length,
    completeCount,
    truncatedCount,
    paths,
    maxPaths,
    maxPathLength,
  };
};

const analyzeControlFlowGraph = (graph) => {
  if (!graph) {
    throw new TypeError('CFG graph is required');
  }

  const nodes = graph.getNodes();
  const edges = graph.getEdges();
  const reachableNodes = getReachableNodes(graph);
  const unreachableNodes = getUnreachableNodes(graph);
  const branchNodes = getBranchNodes(graph);
  const decisionNodes = getDecisionNodes(graph);
  const unreachableAnalysis = analyzeUnreachableCode(graph);
  const branchAnalysis = analyzeBranchStructure(graph);
  const validation = validateGraph(graph);

  return {
    filePath: graph.filePath ?? null,
    language: graph.language ?? null,
    functionName: graph.functionName ?? null,

    nodeCount: nodes.length,
    edgeCount: edges.length,

    reachableNodeCount: reachableNodes.size,
    unreachableNodeCount: unreachableNodes.length,

    reachableNodes: [...reachableNodes],
    unreachableNodes,

    unreachableAnalysis,

    branchCount: branchNodes.length,
    branchNodes,

    decisionCount: decisionNodes.length,
    decisionNodes,

    branchAnalysis,

    cyclomaticComplexity: getCyclomaticComplexity(graph),

    nodeCountsByKind: getNodeCountsByKind(graph),
    edgeCountsByKind: getEdgeCountsByKind(graph),

    entry: graph.entry ?? null,
    exit: graph.exit ?? null,

    validation,
  };
};

export {
  analyzeControlFlowGraph,
  analyzeUnreachableCode,

  getReachableNodes,
  getUnreachableNodes,

  getBranchNodes,
  getBranchCount,

  getDecisionNodes,
  getBranchEdges,
  getBranchEdgeType,
  getDecisionType,
  analyzeBranchNode,
  analyzeBranchStructure,

  analyzePaths,

  getCyclomaticComplexity,
  getNodeCountsByKind,
  getEdgeCountsByKind,

  validateGraph,
};