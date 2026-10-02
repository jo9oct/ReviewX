const CFG_NODE_KINDS = Object.freeze({
  ENTRY: 'entry',
  EXIT: 'exit',
  STATEMENT: 'statement',
  CONDITION: 'condition',
  LOOP: 'loop',
  SWITCH: 'switch',
  TRY: 'try',
  CATCH: 'catch',
  FINALLY: 'finally',
  RETURN: 'return',
  BREAK: 'break',
  CONTINUE: 'continue',
  THROW: 'throw',
  JOIN: 'join',
});

const CFG_EDGE_KINDS = Object.freeze({
  NORMAL: 'normal',
  TRUE: 'true',
  FALSE: 'false',
  LOOP: 'loop',
  BREAK: 'break',
  CONTINUE: 'continue',
  THROW: 'throw',
  EXCEPTION: 'exception',
  RETURN: 'return',
  CASE: 'case',
  DEFAULT: 'default',
});

class CFGNode {
  constructor({
    id,
    kind,
    astNode = null,
    label = null,
    metadata = {},
  }) {
    if (
      typeof id !== 'string' ||
      !id.trim()
    ) {
      throw new TypeError(
        'CFG node id is required.',
      );
    }

    if (
      typeof kind !== 'string' ||
      !kind.trim()
    ) {
      throw new TypeError(
        'CFG node kind is required.',
      );
    }

    this.id = id;
    this.kind = kind;
    this.astNode = astNode;
    this.label = label;
    this.metadata = {
      ...metadata,
    };

    this.outgoing = [];
    this.incoming = [];
  }

  addOutgoing(edge) {
    if (!edge) {
      return false;
    }

    if (
      this.outgoing.some(
        (existing) =>
          existing.id === edge.id,
      )
    ) {
      return false;
    }

    this.outgoing.push(edge);

    return true;
  }

  addIncoming(edge) {
    if (!edge) {
      return false;
    }

    if (
      this.incoming.some(
        (existing) =>
          existing.id === edge.id,
      )
    ) {
      return false;
    }

    this.incoming.push(edge);

    return true;
  }

  getSuccessors() {
    return this.outgoing.map(
      (edge) => edge.target,
    );
  }

  getPredecessors() {
    return this.incoming.map(
      (edge) => edge.source,
    );
  }

  toJSON() {
    return {
      id: this.id,
      kind: this.kind,
      label: this.label,
      astNode: this.astNode,
      metadata: {
        ...this.metadata,
      },
      outgoing: this.outgoing.map(
        (edge) => edge.toJSON(),
      ),
      incoming: this.incoming.map(
        (edge) => edge.toJSON(),
      ),
    };
  }
}

class CFGEdge {
  constructor({
    id,
    source,
    target,
    kind = CFG_EDGE_KINDS.NORMAL,
    label = null,
    metadata = {},
  }) {
    if (
      typeof id !== 'string' ||
      !id.trim()
    ) {
      throw new TypeError(
        'CFG edge id is required.',
      );
    }

    if (!(source instanceof CFGNode)) {
      throw new TypeError(
        'CFG edge source must be a CFGNode.',
      );
    }

    if (!(target instanceof CFGNode)) {
      throw new TypeError(
        'CFG edge target must be a CFGNode.',
      );
    }

    this.id = id;
    this.source = source;
    this.target = target;
    this.kind = kind;
    this.label = label;
    this.metadata = {
      ...metadata,
    };
  }

  toJSON() {
    return {
      id: this.id,
      sourceId: this.source.id,
      targetId: this.target.id,
      kind: this.kind,
      label: this.label,
      metadata: {
        ...this.metadata,
      },
    };
  }
}

class ControlFlowGraph {
  constructor({
    filePath = null,
    language = null,
    functionName = null,
  } = {}) {
    this.filePath = filePath;
    this.language = language;
    this.functionName = functionName;

    this.nodeCounter = 0;
    this.edgeCounter = 0;

    this.nodes = new Map();
    this.edges = new Map();

    this.entry = null;
    this.exit = null;
  }

  createNode({
    kind,
    astNode = null,
    label = null,
    metadata = {},
  }) {
    const id =
      `cfg-node-${++this.nodeCounter}`;

    const node =
      new CFGNode({
        id,
        kind,
        astNode,
        label,
        metadata,
      });

    this.nodes.set(
      id,
      node,
    );

    return node;
  }

  createEdge({
    source,
    target,
    kind = CFG_EDGE_KINDS.NORMAL,
    label = null,
    metadata = {},
  }) {
    if (!(source instanceof CFGNode)) {
      throw new TypeError(
        'CFG edge source must be a CFGNode.',
      );
    }

    if (!(target instanceof CFGNode)) {
      throw new TypeError(
        'CFG edge target must be a CFGNode.',
      );
    }

    const id =
      `cfg-edge-${++this.edgeCounter}`;

    const edge =
      new CFGEdge({
        id,
        source,
        target,
        kind,
        label,
        metadata,
      });

    this.edges.set(
      id,
      edge,
    );

    source.addOutgoing(edge);
    target.addIncoming(edge);

    return edge;
  }

  setEntry(node) {
    if (!(node instanceof CFGNode)) {
      throw new TypeError(
        'CFG entry must be a CFGNode.',
      );
    }

    this.entry = node;

    return node;
  }

  setExit(node) {
    if (!(node instanceof CFGNode)) {
      throw new TypeError(
        'CFG exit must be a CFGNode.',
      );
    }

    this.exit = node;

    return node;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getEdge(id) {
    return this.edges.get(id) || null;
  }

  getNodes() {
    return [
      ...this.nodes.values(),
    ];
  }

  getEdges() {
    return [
      ...this.edges.values(),
    ];
  }

  getSuccessors(node) {
    if (!(node instanceof CFGNode)) {
      return [];
    }

    return node.getSuccessors();
  }

  getPredecessors(node) {
    if (!(node instanceof CFGNode)) {
      return [];
    }

    return node.getPredecessors();
  }

  toJSON() {
    return {
      filePath: this.filePath,
      language: this.language,
      functionName: this.functionName,
      entryId: this.entry?.id || null,
      exitId: this.exit?.id || null,
      nodes: this.getNodes().map(
        (node) => ({
          id: node.id,
          kind: node.kind,
          label: node.label,
          astNode: node.astNode,
          metadata: {
            ...node.metadata,
          },
        }),
      ),
      edges: this.getEdges().map(
        (edge) => edge.toJSON(),
      ),
    };
  }
}

export {
  CFG_NODE_KINDS,
  CFG_EDGE_KINDS,
  CFGNode,
  CFGEdge,
  ControlFlowGraph,
};

export default ControlFlowGraph;