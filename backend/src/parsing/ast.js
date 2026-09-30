const getNodeText = (node) => {
  if (!node) {
    return null;
  }

  try {
    if (typeof node.text === 'string') {
      return node.text;
    }
  } catch {
    // Tree-sitter node text may not be available
    // when the original source is not attached.
  }

  return null;
};

const getNodeLocation = (node) => {
  if (!node) {
    return null;
  }

  return {
    start: {
      row: node.startPosition?.row ?? 0,
      column: node.startPosition?.column ?? 0,
    },
    end: {
      row: node.endPosition?.row ?? 0,
      column: node.endPosition?.column ?? 0,
    },
  };
};

const nodeToAst = (node, depth = 0) => {
  if (!node) {
    return null;
  }

  const type =
    typeof node.type === 'string'
      ? node.type
      : 'unknown';

  const text = getNodeText(node);

  const astNode = {
    type,

    named:
      typeof node.isNamed === 'boolean'
        ? node.isNamed
        : true,

    text,

    start: {
      row:
        node.startPosition?.row ?? 0,
      column:
        node.startPosition?.column ?? 0,
    },

    end: {
      row:
        node.endPosition?.row ?? 0,
      column:
        node.endPosition?.column ?? 0,
    },

    startIndex:
      Number.isInteger(node.startIndex)
        ? node.startIndex
        : null,

    endIndex:
      Number.isInteger(node.endIndex)
        ? node.endIndex
        : null,

    children: [],
  };

  if (depth >= 1000) {
    return astNode;
  }

  const namedChildren =
    Array.isArray(node.namedChildren)
      ? node.namedChildren
      : [];

  for (const child of namedChildren) {
    const childAst =
      nodeToAst(
        child,
        depth + 1
      );

    if (childAst) {
      astNode.children.push(
        childAst
      );
    }
  }

  return astNode;
};

const buildAst = (
  tree,
  source = null
) => {
  if (!tree?.rootNode) {
    return null;
  }

  const ast =
    nodeToAst(
      tree.rootNode
    );

  if (
    ast &&
    typeof source === 'string'
  ) {
    ast.sourceLength =
      Buffer.byteLength(
        source,
        'utf8'
      );
  }

  return ast;
};

const walkAst = (
  node,
  visitor
) => {
  if (
    !node ||
    typeof visitor !==
      'function'
  ) {
    return;
  }

  visitor(node);

  for (
    const child of
    node.children || []
  ) {
    walkAst(
      child,
      visitor
    );
  }
};

const collectNodes = (
  node,
  predicate = null
) => {
  const nodes = [];

  walkAst(
    node,
    (current) => {
      if (
        typeof predicate !==
          'function' ||
        predicate(current)
      ) {
        nodes.push(current);
      }
    }
  );

  return nodes;
};

const findNodesByType = (
  node,
  types
) => {
  const typeSet =
    new Set(
      Array.isArray(types)
        ? types
        : [types]
    );

  return collectNodes(
    node,
    (current) =>
      typeSet.has(
        current?.type
      )
  );
};

const findNodesByText = (
  node,
  text
) => {
  if (
    typeof text !== 'string' ||
    !text
  ) {
    return [];
  }

  return collectNodes(
    node,
    (current) =>
      typeof current?.text ===
        'string' &&
      current.text.includes(
        text
      )
  );
};

export {
  nodeToAst,
  buildAst,
  walkAst,
  collectNodes,
  findNodesByType,
  findNodesByText,
};

export default buildAst;