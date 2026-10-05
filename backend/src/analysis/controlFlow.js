const getNodeType = (node) => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  return (
    node.type ||
    node.nodeType ||
    null
  );
};

const getChildren = (node) => {
  if (!node || typeof node !== 'object') {
    return [];
  }

  if (
    Array.isArray(node.namedChildren)
  ) {
    return node.namedChildren;
  }

  if (
    Array.isArray(node.children)
  ) {
    return node.children;
  }

  if (
    Array.isArray(node.body)
  ) {
    return node.body;
  }

  return [];
};

const getLocation = (node) => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.location) {
    return node.location;
  }

  if (node.loc) {
    return node.loc;
  }

  if (
    Number.isInteger(
      node.startPosition?.row,
    )
  ) {
    return {
      start: {
        line:
          node.startPosition.row + 1,
        column:
          node.startPosition.column + 1,
      },
      end: {
        line:
          Number.isInteger(
            node.endPosition?.row,
          )
            ? node.endPosition.row + 1
            : node.startPosition.row + 1,
        column:
          Number.isInteger(
            node.endPosition?.column,
          )
            ? node.endPosition.column + 1
            : node.startPosition.column + 1,
      },
    };
  }

  return null;
};

const createControlFlowGraph = () => {
  const nodes = new Map();
  const edges = [];

  const addNode = ({
    id,
    type,
    location = null,
  }) => {
    if (!id) {
      return null;
    }

    const node = {
      id,
      type:
        type || 'unknown',
      location,
    };

    nodes.set(id, node);

    return node;
  };

  const addEdge = ({
    from,
    to,
    type = 'normal',
  }) => {
    if (
      !nodes.has(from) ||
      !nodes.has(to)
    ) {
      return false;
    }

    edges.push({
      from,
      to,
      type,
    });

    return true;
  };

  return {
    addNode,
    addEdge,

    getNodes: () => [
      ...nodes.values(),
    ],

    getEdges: () => [
      ...edges,
    ],
  };
};

const buildControlFlowGraph = ({
  file,
  ast,
}) => {
  const graph =
    createControlFlowGraph();

  if (
    !ast ||
    typeof ast !== 'object'
  ) {
    return graph;
  }

  let counter = 0;
  let previousNodeId = null;

  const visit = (node) => {
    if (
      !node ||
      typeof node !== 'object'
    ) {
      return;
    }

    const id =
      `cfg:${file?.path || 'source'}:${counter++}`;

    const current =
      graph.addNode({
        id,
        type:
          getNodeType(node) ||
          'unknown',
        location:
          getLocation(node),
      });

    if (
      previousNodeId &&
      current
    ) {
      graph.addEdge({
        from: previousNodeId,
        to: current.id,
        type: 'normal',
      });
    }

    if (current) {
      previousNodeId =
        current.id;
    }

    for (
      const child of getChildren(node)
    ) {
      visit(child);
    }
  };

  visit(ast);

  return graph;
};

const buildControlFlowFoundation = (
  ast,
) =>
  buildControlFlowGraph({
    file: {
      path: 'source',
    },
    ast,
  });

export {
  createControlFlowGraph,
  buildControlFlowGraph,
  buildControlFlowFoundation,
};