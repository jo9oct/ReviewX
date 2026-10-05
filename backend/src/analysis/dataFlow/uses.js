import {
  ASSIGNMENT_OPERATORS,
  isAssignmentOperator,
} from './definitions.js';

const getChildren = (node) => {
  return Array.isArray(node?.children)
    ? node.children
    : [];
};

const isIdentifier = (node) => {
  return node?.type === 'identifier';
};

const getOperator = (node) => {
  if (!node) {
    return null;
  }

  if (
    typeof node.operator === 'string'
  ) {
    return node.operator;
  }

  const operatorNode =
    getChildren(node).find(
      (child) =>
        typeof child?.text === 'string' &&
        isAssignmentOperator(child.text),
    );

  return operatorNode?.text || null;
};

const getLocation = (node) => {
  return {
    startIndex:
      Number.isInteger(node?.startIndex)
        ? node.startIndex
        : null,

    endIndex:
      Number.isInteger(node?.endIndex)
        ? node.endIndex
        : null,
  };
};

const createUse = ({
  node,
  kind = 'read',
}) => {
  return {
    name: node.text,
    kind,
    ...getLocation(node),
  };
};

const findFirstIdentifier = (node) => {
  if (!node) {
    return null;
  }

  if (isIdentifier(node)) {
    return node;
  }

  for (const child of getChildren(node)) {
    const identifier =
      findFirstIdentifier(child);

    if (identifier) {
      return identifier;
    }
  }

  return null;
};

const getAssignmentLeftNode = (
  node,
) => {
  const children =
    getChildren(node);

  if (children.length === 0) {
    return null;
  }

  return findFirstIdentifier(
    children[0],
  );
};

const isDeclarationNode = (node) => {
  return [
    'lexical_declaration',
    'variable_declaration',
    'variable_declarator',
  ].includes(node?.type);
};

const getDeclaratorNameNode = (
  node,
) => {
  if (
    node?.type !==
      'variable_declarator'
  ) {
    return null;
  }

  return findFirstIdentifier(
    getChildren(node)[0],
  );
};

const collectIdentifierUses = (
  node,
  uses,
  excludedNodes = new Set(),
) => {
  if (!node) {
    return;
  }

  if (
    isIdentifier(node) &&
    !excludedNodes.has(node)
  ) {
    uses.push(
      createUse({
        node,
        kind: 'read',
      }),
    );

    return;
  }

  for (const child of getChildren(node)) {
    collectIdentifierUses(
      child,
      uses,
      excludedNodes,
    );
  }
};

const collectDeclarationUses = (
  node,
  uses,
) => {
  if (!node) {
    return;
  }

  if (
    node.type ===
      'variable_declarator'
  ) {
    const children =
      getChildren(node);

    const nameNode =
      getDeclaratorNameNode(node);

    const excluded =
      new Set();

    if (nameNode) {
      excluded.add(nameNode);
    }

    for (
      let index = 1;
      index < children.length;
      index += 1
    ) {
      collectIdentifierUses(
        children[index],
        uses,
        excluded,
      );
    }

    return;
  }

  for (const child of getChildren(node)) {
    collectDeclarationUses(
      child,
      uses,
    );
  }
};

const collectAssignmentUses = (
  node,
  uses,
) => {
  if (!node) {
    return;
  }

  if (
    node.type ===
      'assignment_expression' ||
    node.type ===
      'augmented_assignment_expression'
  ) {
    const children =
      getChildren(node);

    const left =
      getAssignmentLeftNode(node);

    const operator =
      getOperator(node);

    /*
     * Simple assignment:
     *
     * result = value
     *
     * result is a definition, not a use.
     */
    if (
      operator === '=' ||
      node.type ===
        'assignment_expression'
    ) {
      for (
        let index = 1;
        index < children.length;
        index += 1
      ) {
        const child =
          children[index];

        if (
          typeof child?.text ===
            'string' &&
          isAssignmentOperator(
            child.text,
          )
        ) {
          continue;
        }

        collectIdentifierUses(
          child,
          uses,
        );
      }

      return;
    }

    /*
     * Compound assignment:
     *
     * result += 1
     *
     * result is both read and written.
     */
    if (left) {
      uses.push(
        createUse({
          node: left,
          kind: 'read_write',
        }),
      );
    }

    for (
      let index = 1;
      index < children.length;
      index += 1
    ) {
      const child =
        children[index];

      if (
        typeof child?.text ===
          'string' &&
        isAssignmentOperator(
          child.text,
        )
      ) {
        continue;
      }

      collectIdentifierUses(
        child,
        uses,
      );
    }

    return;
  }

  for (const child of getChildren(node)) {
    collectAssignmentUses(
      child,
      uses,
    );
  }
};

const collectGenericUses = (
  node,
  uses,
) => {
  if (!node) {
    return;
  }

  if (isDeclarationNode(node)) {
    collectDeclarationUses(
      node,
      uses,
    );

    return;
  }

  if (
    node.type ===
      'assignment_expression' ||
    node.type ===
      'augmented_assignment_expression'
  ) {
    collectAssignmentUses(
      node,
      uses,
    );

    return;
  }

  if (isIdentifier(node)) {
    uses.push(
      createUse({
        node,
        kind: 'read',
      }),
    );

    return;
  }

  for (const child of getChildren(node)) {
    collectGenericUses(
      child,
      uses,
    );
  }
};

const removeDuplicateUses = (
  uses,
) => {
  const seen = new Set();
  const result = [];

  for (const use of uses) {
    const key = [
      use.name,
      use.kind,
      use.startIndex,
      use.endIndex,
    ].join(':');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(use);
  }

  return result;
};

const getNodeUses = (
  node,
) => {
  if (!node) {
    return [];
  }

  const uses = [];

  if (
    node.type ===
      'lexical_declaration' ||
    node.type ===
      'variable_declaration'
  ) {
    collectDeclarationUses(
      node,
      uses,
    );
  } else if (
    node.type ===
      'assignment_expression' ||
    node.type ===
      'augmented_assignment_expression'
  ) {
    collectAssignmentUses(
      node,
      uses,
    );
  } else {
    collectGenericUses(
      node,
      uses,
    );
  }

  return removeDuplicateUses(
    uses,
  );
};

export {
  getNodeUses,
};

export default getNodeUses;