const createDataFlowGraph = () => {
  const nodes = new Map();
  const edges = [];

  const addNode = ({
    id,
    type,
    symbol = null,
    expression = null,
    location = null,
  }) => {
    if (!id) {
      return null;
    }

    const existing = nodes.get(id);

    if (existing) {
      return existing;
    }

    const node = {
      id,
      type: type || 'unknown',
      symbol,
      expression,
      location,
    };

    nodes.set(id, node);

    return node;
  };

  const addEdge = ({
    from,
    to,
    type = 'data',
  }) => {
    if (
      !nodes.has(from) ||
      !nodes.has(to)
    ) {
      return false;
    }

    const duplicate = edges.some(
      edge =>
        edge.from === from &&
        edge.to === to &&
        edge.type === type,
    );

    if (duplicate) {
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

const getNodeType = node => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (typeof node.type === 'string') {
    return node.type;
  }

  if (typeof node.nodeType === 'string') {
    return node.nodeType;
  }

  return null;
};

const getNodeText = node => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (typeof node.text === 'string') {
    return node.text;
  }

  if (typeof node.value === 'string') {
    return node.value;
  }

  if (typeof node.name === 'string') {
    return node.name;
  }

  return null;
};

const getChildren = node => {
  if (!node || typeof node !== 'object') {
    return [];
  }

  if (Array.isArray(node.children)) {
    return node.children.filter(Boolean);
  }

  if (Array.isArray(node.namedChildren)) {
    return node.namedChildren.filter(Boolean);
  }

  return [];
};

const getLocation = node => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.location) {
    return node.location;
  }

  if (
    node.start &&
    typeof node.start === 'object'
  ) {
    return {
      start: {
        line:
          Number.isInteger(node.start.row)
            ? node.start.row + 1
            : node.start.line ?? 1,

        column:
          Number.isInteger(node.start.column)
            ? node.start.column + 1
            : node.start.column ?? 1,
      },

      end: {
        line:
          Number.isInteger(node.end?.row)
            ? node.end.row + 1
            : node.end?.line ??
              node.start.line ??
              1,

        column:
          Number.isInteger(node.end?.column)
            ? node.end.column + 1
            : node.end?.column ??
              node.start.column ??
              1,
      },
    };
  }

  return null;
};

const normalizeIdentifier = value => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (
    !normalized ||
    !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(
      normalized,
    )
  ) {
    return null;
  }

  return normalized;
};

const collectAstNodes = ast => {
  const nodes = [];
  const visited = new WeakSet();

  const visit = node => {
    if (
      !node ||
      typeof node !== 'object'
    ) {
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    nodes.push(node);

    for (const child of getChildren(node)) {
      visit(child);
    }
  };

  visit(ast);

  return nodes;
};

const getSymbolName = symbol => {
  if (!symbol || typeof symbol !== 'object') {
    return null;
  }

  return normalizeIdentifier(
    symbol.name ||
      symbol.identifier ||
      symbol.symbol,
  );
};

const addSymbolNodes = ({
  graph,
  file,
  symbols,
}) => {
  if (
    !symbols ||
    typeof symbols.getSymbols !== 'function'
  ) {
    return new Map();
  }

  const symbolNodes = new Map();

  for (const symbol of symbols.getSymbols()) {
    const name = getSymbolName(symbol);

    if (!name) {
      continue;
    }

    const id =
      `dfg:${file?.path || 'source'}:symbol:${name}`;

    const node = graph.addNode({
      id,
      type: 'symbol',
      symbol: name,
      expression: null,
      location:
        symbol.location || null,
    });

    if (node) {
      symbolNodes.set(name, node);
    }
  }

  return symbolNodes;
};

const addAstExpressionNodes = ({
  graph,
  file,
  ast,
  symbolNodes,
}) => {
  const astNodes =
    collectAstNodes(ast);

  for (const node of astNodes) {
    const type =
      getNodeType(node);

    const text =
      getNodeText(node);

    if (!type || !text) {
      continue;
    }

    const normalizedType =
      type.toLowerCase();

    const isExpression =
      normalizedType.includes(
        'expression',
      ) ||
      normalizedType.includes(
        'identifier',
      ) ||
      normalizedType ===
        'variable_declarator';

    if (!isExpression) {
      continue;
    }

    const expression =
      text.trim();

    if (!expression) {
      continue;
    }

    const startIndex =
      Number.isInteger(
        node.startIndex,
      )
        ? node.startIndex
        : null;

    const id =
      `dfg:${file?.path || 'source'}:expression:${
        startIndex ?? graph.getNodes().length
      }`;

    graph.addNode({
      id,
      type: 'expression',
      symbol: null,
      expression,
      location:
        getLocation(node),
    });

    /*
     * Connect an identifier expression to
     * its corresponding symbol node.
     */
    const identifier =
      normalizeIdentifier(
        expression,
      );

    if (
      identifier &&
      symbolNodes.has(identifier)
    ) {
      graph.addEdge({
        from: id,
        to: symbolNodes.get(identifier).id,
        type: 'symbol-reference',
      });
    }
  }
};

const getVariableDeclarationParts = node => {
  const type =
    getNodeType(node);

  if (
    type !== 'variable_declarator'
  ) {
    return null;
  }

  const children =
    getChildren(node);

  if (children.length < 2) {
    return null;
  }

  const name =
    normalizeIdentifier(
      getNodeText(children[0]),
    );

  if (!name) {
    return null;
  }

  const value =
    children[children.length - 1];

  return {
    name,
    value,
  };
};

const collectIdentifiers = node => {
  const identifiers = [];
  const seen = new WeakSet();

  const visit = current => {
    if (
      !current ||
      typeof current !== 'object'
    ) {
      return;
    }

    if (seen.has(current)) {
      return;
    }

    seen.add(current);

    const type =
      getNodeType(current);

    const text =
      getNodeText(current);

    if (
      type === 'identifier' &&
      text
    ) {
      const identifier =
        normalizeIdentifier(text);

      if (identifier) {
        identifiers.push({
          name: identifier,
          node: current,
        });
      }
    }

    for (
      const child of
      getChildren(current)
    ) {
      visit(child);
    }
  };

  visit(node);

  return identifiers;
};

const addVariableDataEdges = ({
  graph,
  ast,
  symbolNodes,
}) => {
  const astNodes =
    collectAstNodes(ast);

  for (const node of astNodes) {
    const declaration =
      getVariableDeclarationParts(node);

    if (!declaration) {
      continue;
    }

    const target =
      symbolNodes.get(
        declaration.name,
      );

    if (!target) {
      continue;
    }

    const identifiers =
      collectIdentifiers(
        declaration.value,
      );

    for (const identifier of identifiers) {
      const source =
        symbolNodes.get(
          identifier.name,
        );

      if (!source) {
        continue;
      }

      if (
        source.id === target.id
      ) {
        continue;
      }

      graph.addEdge({
        from: source.id,
        to: target.id,
        type: 'assignment',
      });
    }
  }
};

const addExpressionDataEdges = ({
  graph,
  ast,
  symbolNodes,
}) => {
  const astNodes =
    collectAstNodes(ast);

  for (const node of astNodes) {
    const type =
      getNodeType(node);

    if (
      type !== 'binary_expression' &&
      type !== 'assignment_expression'
    ) {
      continue;
    }

    const identifiers =
      collectIdentifiers(node);

    const names = [
      ...new Set(
        identifiers.map(
          item => item.name,
        ),
      ),
    ];

    if (names.length < 2) {
      continue;
    }

    for (
      let index = 0;
      index < names.length - 1;
      index += 1
    ) {
      const from =
        symbolNodes.get(
          names[index],
        );

      const to =
        symbolNodes.get(
          names[index + 1],
        );

      if (!from || !to) {
        continue;
      }

      graph.addEdge({
        from: from.id,
        to: to.id,
        type: 'expression-flow',
      });
    }
  }
};

const buildDataFlowGraph = ({
  file,
  ast,
  symbols,
  controlFlow = null,
}) => {
  const graph =
    createDataFlowGraph();

  const symbolNodes =
    addSymbolNodes({
      graph,
      file,
      symbols,
    });

  if (
    ast &&
    typeof ast === 'object'
  ) {
    addAstExpressionNodes({
      graph,
      file,
      ast,
      symbolNodes,
    });

    addVariableDataEdges({
      graph,
      ast,
      symbolNodes,
    });

    addExpressionDataEdges({
      graph,
      ast,
      symbolNodes,
    });
  }

  /*
   * Control-flow information is supplemental.
   * It must never create artificial data-flow
   * relationships between unrelated symbols.
   */
  if (
    controlFlow &&
    typeof controlFlow.getEdges ===
      'function'
  ) {
    const controlEdges =
      controlFlow.getEdges();

    for (const edge of controlEdges) {
      if (
        !edge ||
        !edge.from ||
        !edge.to
      ) {
        continue;
      }

      const from =
        graph.getNodes().find(
          node =>
            node.id.endsWith(
              String(edge.from),
            ),
        );

      const to =
        graph.getNodes().find(
          node =>
            node.id.endsWith(
              String(edge.to),
            ),
        );

      if (from && to) {
        graph.addEdge({
          from: from.id,
          to: to.id,
          type: 'control-data',
        });
      }
    }
  }

  if (
    graph.getNodes().length === 0 &&
    ast &&
    typeof ast === 'object'
  ) {
    graph.addNode({
      id:
        `dfg:${file?.path || 'source'}:root`,
      type:
        getNodeType(ast) ||
        'root',
      expression:
        getNodeText(ast),
      location:
        getLocation(ast),
    });
  }

  return graph;
};

const buildDataFlowFoundation = symbolTable =>
  buildDataFlowGraph({
    file: {
      path: 'source',
    },
    ast: null,
    symbols: symbolTable,
  });

export {
  createDataFlowGraph,
  buildDataFlowGraph,
  buildDataFlowFoundation,
};

export default buildDataFlowGraph;