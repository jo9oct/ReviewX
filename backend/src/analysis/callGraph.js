const getNodeType = (node) => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  return node.type || node.nodeType || null;
};

const getChildren = (node) => {
  if (!node || typeof node !== 'object') {
    return [];
  }

  if (Array.isArray(node.children)) {
    return node.children;
  }

  if (Array.isArray(node.namedChildren)) {
    return node.namedChildren;
  }

  if (Array.isArray(node.body)) {
    return node.body;
  }

  return [];
};

const getNodeText = (node) => {
  if (!node || typeof node !== 'object') {
    return '';
  }

  return typeof node.text === 'string'
    ? node.text.trim()
    : '';
};

const getNodeName = (node) => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (typeof node.name === 'string') {
    return node.name.trim() || null;
  }

  if (typeof node.identifier === 'string') {
    return node.identifier.trim() || null;
  }

  if (
    node.name &&
    typeof node.name === 'object'
  ) {
    return getNodeName(node.name);
  }

  if (
    node.identifier &&
    typeof node.identifier === 'object'
  ) {
    return getNodeName(node.identifier);
  }

  return null;
};

const getLocation = (node) => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.location) {
    return node.location;
  }

  if (node.start && node.end) {
    return {
      start: {
        line:
          Number.isInteger(node.start.row)
            ? node.start.row + 1
            : 1,
        column:
          Number.isInteger(node.start.column)
            ? node.start.column + 1
            : 1,
      },
      end: {
        line:
          Number.isInteger(node.end.row)
            ? node.end.row + 1
            : 1,
        column:
          Number.isInteger(node.end.column)
            ? node.end.column + 1
            : 1,
      },
    };
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

const getSymbolLocation = (symbol) => {
  if (!symbol || typeof symbol !== 'object') {
    return null;
  }

  if (symbol.location) {
    return symbol.location;
  }

  if (symbol.start && symbol.end) {
    return {
      start: {
        line:
          Number.isInteger(symbol.start.row)
            ? symbol.start.row + 1
            : 1,
        column:
          Number.isInteger(symbol.start.column)
            ? symbol.start.column + 1
            : 1,
      },
      end: {
        line:
          Number.isInteger(symbol.end.row)
            ? symbol.end.row + 1
            : 1,
        column:
          Number.isInteger(symbol.end.column)
            ? symbol.end.column + 1
            : 1,
      },
    };
  }

  return null;
};

const createCallGraph = () => {
  const nodes = new Map();
  const edges = [];

  const addNode = ({
    id,
    name,
    filePath,
    location = null,
    kind = 'unknown',
  }) => {
    if (
      typeof id !== 'string' ||
      !id.trim()
    ) {
      return null;
    }

    const existing = nodes.get(id);

    if (existing) {
      return existing;
    }

    const node = {
      id,
      name: name || 'anonymous',
      filePath,
      location,
      kind,
    };

    nodes.set(id, node);

    return node;
  };

  const addEdge = ({
    caller,
    callee,
    type = 'direct',
  }) => {
    if (
      !nodes.has(caller) ||
      !nodes.has(callee)
    ) {
      return false;
    }

    const exists = edges.some(
      (edge) =>
        edge.caller === caller &&
        edge.callee === callee &&
        edge.type === type,
    );

    if (exists) {
      return false;
    }

    edges.push({
      caller,
      callee,
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

const isFunctionNode = (node) => {
  const type = getNodeType(node);

  return (
    type === 'function_declaration' ||
    type === 'function_expression' ||
    type === 'arrow_function' ||
    type === 'method_definition' ||
    type === 'method'
  );
};

const isCallNode = (node) => {
  const type = getNodeType(node);

  return (
    type === 'call_expression' ||
    type === 'call' ||
    type === 'new_expression'
  );
};

const getFunctionName = (node) => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const directName =
    getNodeName(node);

  if (directName) {
    return directName;
  }

  const children =
    getChildren(node);

  for (const child of children) {
    const childType =
      getNodeType(child);

    if (
      childType === 'identifier' ||
      childType === 'property_identifier'
    ) {
      const text =
        getNodeText(child);

      if (text) {
        return text;
      }
    }
  }

  return null;
};

const getCallName = (node) => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const directName =
    getNodeName(node);

  if (directName) {
    return directName;
  }

  const children =
    getChildren(node);

  /*
   * Tree-sitter JavaScript call expressions normally
   * contain the function/member expression as a child.
   */
  for (const child of children) {
    const childType =
      getNodeType(child);

    if (
      childType === 'identifier' ||
      childType === 'property_identifier'
    ) {
      const text =
        getNodeText(child);

      if (text) {
        return text;
      }
    }

    if (
      childType === 'member_expression'
    ) {
      const text =
        getNodeText(child);

      if (text) {
        return text;
      }
    }
  }

  /*
   * Fallback for normalized AST nodes where the
   * complete call expression is available as text.
   */
  const text =
    getNodeText(node);

  if (!text) {
    return null;
  }

  const normalized =
    text
      .replace(/^new\s+/, '')
      .trim();

  const match =
    normalized.match(
      /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/,
    );

  if (!match) {
    return null;
  }

  return match[1];
};

const normalizeFunctionName = (
  name,
) => {
  if (
    typeof name !== 'string'
  ) {
    return null;
  }

  const normalized =
    name.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
};

const resolveFunctionName = (
  name,
  functionNames,
) => {
  const normalized =
    normalizeFunctionName(name);

  if (!normalized) {
    return null;
  }

  const direct =
    functionNames.get(normalized);

  if (direct) {
    return direct;
  }

  /*
   * A call such as:
   *
   *   this.authenticate()
   *
   * should not be treated as a local
   * function unless the exact function name
   * is known.
   *
   * For member calls, only the final property
   * is considered as a conservative fallback.
   */
  const parts =
    normalized.split('.');

  if (parts.length > 1) {
    return (
      functionNames.get(
        parts[parts.length - 1],
      ) || null
    );
  }

  return null;
};

const buildCallGraph = ({
  file,
  ast,
  symbols,
}) => {
  const graph =
    createCallGraph();

  const filePath =
    file?.path || 'source';

  const functionNames =
    new Map();

  /*
   * First register function symbols.
   *
   * symbolTable.js uses:
   *
   *   symbol.type === 'function'
   *
   * not symbol.kind.
   */
  if (
    symbols &&
    typeof symbols.getSymbols ===
      'function'
  ) {
    for (
      const symbol of
        symbols.getSymbols()
    ) {
      if (!symbol) {
        continue;
      }

      const symbolType =
        symbol.type ||
        symbol.kind;

      if (
        symbolType !== 'function' &&
        symbolType !== 'method'
      ) {
        continue;
      }

      const symbolName =
        normalizeFunctionName(
          symbol.name,
        );

      if (!symbolName) {
        continue;
      }

      const id =
        `call:${filePath}:function:${symbol.id}`;

      const node =
        graph.addNode({
          id,
          name: symbolName,
          filePath,
          location:
            getSymbolLocation(symbol),
          kind: 'function',
        });

      if (node) {
        functionNames.set(
          symbolName,
          node.id,
        );
      }
    }
  }

  const discoveredFunctions =
    new Set();

  const discoveredCalls = [];

  const visit = (
    node,
    currentFunctionId = null,
  ) => {
    if (
      !node ||
      typeof node !== 'object'
    ) {
      return;
    }

    if (isFunctionNode(node)) {
      const functionName =
        getFunctionName(node);

      let functionId =
        resolveFunctionName(
          functionName,
          functionNames,
        );

      /*
       * Anonymous functions are represented
       * as nodes, but are never added to the
       * name-resolution map.
       */
      if (!functionId) {
        const anonymousIndex =
          discoveredFunctions.size;

        functionId =
          `call:${filePath}:function:anonymous:${anonymousIndex}`;

        graph.addNode({
          id: functionId,
          name:
            functionName ||
            'anonymous',
          filePath,
          location:
            getLocation(node),
          kind: 'function',
        });
      }

      discoveredFunctions.add(
        functionId,
      );

      for (
        const child of
          getChildren(node)
      ) {
        visit(
          child,
          functionId,
        );
      }

      return;
    }

    if (isCallNode(node)) {
      const callName =
        getCallName(node);

      if (callName) {
        discoveredCalls.push({
          name: callName,
          callerId:
            currentFunctionId,
          node,
        });
      }
    }

    for (
      const child of
        getChildren(node)
    ) {
      visit(
        child,
        currentFunctionId,
      );
    }
  };

  visit(ast);

  /*
   * Resolve only calls whose target is a
   * verified local function symbol.
   *
   * External functions such as:
   *
   *   express()
   *   console.log()
   *   res.send()
   *   app.listen()
   *
   * are not fabricated into the graph.
   */
  for (
    const call of discoveredCalls
  ) {
    if (!call.callerId) {
      continue;
    }

    const calleeId =
      resolveFunctionName(
        call.name,
        functionNames,
      );

    if (!calleeId) {
      continue;
    }

    graph.addEdge({
      caller:
        call.callerId,
      callee:
        calleeId,
      type: 'direct',
    });
  }

  return {
    nodes: new Map(
      graph
        .getNodes()
        .map((node) => [
          node.id,
          node,
        ]),
    ),

    edges:
      graph.getEdges(),
  };
};

export {
  createCallGraph,
  buildCallGraph,
};