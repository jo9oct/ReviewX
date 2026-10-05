const ASSIGNMENT_OPERATORS = new Set([
  '=',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '**=',
  '<<=',
  '>>=',
  '>>>=',
  '&=',
  '|=',
  '^=',
  '&&=',
  '||=',
  '??=',
]);

const getChildren = (node) => {
  return Array.isArray(node?.children)
    ? node.children
    : [];
};

const isIdentifier = (node) => {
  return node?.type === 'identifier';
};

const isAssignmentOperator = (operator) => {
  return ASSIGNMENT_OPERATORS.has(operator);
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

const createDefinition = ({
  node,
  kind = 'variable',
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

const getDeclarationKind = (node) => {
  let current = node;

  while (current) {
    if (
      current.type ===
        'lexical_declaration'
    ) {
      const text =
        typeof current.text === 'string'
          ? current.text.trim()
          : '';

      if (
        text.startsWith('const ')
      ) {
        return 'constant';
      }

      if (
        text.startsWith('let ')
      ) {
        return 'variable';
      }

      return 'variable';
    }

    if (
      current.type ===
        'variable_declaration'
    ) {
      return 'variable';
    }

    current = null;
  }

  return 'variable';
};

const getDirectDeclaratorIdentifier = (
  node,
) => {
  if (!node) {
    return null;
  }

  if (
    node.type ===
      'variable_declarator'
  ) {
    const firstChild =
      getChildren(node)[0];

    if (isIdentifier(firstChild)) {
      return firstChild;
    }

    return findFirstIdentifier(
      firstChild,
    );
  }

  return findFirstIdentifier(node);
};

const collectDeclarationDefinitions = (
  node,
  definitions,
) => {
  if (!node) {
    return;
  }

  if (
    node.type ===
      'lexical_declaration' ||
    node.type ===
      'variable_declaration'
  ) {
    const declarationKind =
      getDeclarationKind(node);

    for (const child of getChildren(node)) {
      if (
        child.type !==
          'variable_declarator'
      ) {
        continue;
      }

      const identifier =
        getDirectDeclaratorIdentifier(
          child,
        );

      if (!identifier) {
        continue;
      }

      definitions.push(
        createDefinition({
          node: identifier,
          kind: declarationKind,
        }),
      );
    }

    return;
  }

  for (const child of getChildren(node)) {
    if (
      child.type ===
        'variable_declarator'
    ) {
      const identifier =
        getDirectDeclaratorIdentifier(
          child,
        );

      if (identifier) {
        definitions.push(
          createDefinition({
            node: identifier,
            kind: 'variable',
          }),
        );
      }

      continue;
    }

    collectDeclarationDefinitions(
      child,
      definitions,
    );
  }
};

const getAssignmentLeftNode = (
  node,
) => {
  const children =
    getChildren(node);

  if (children.length === 0) {
    return null;
  }

  const first =
    children[0];

  if (
    first.type ===
      'parenthesized_expression'
  ) {
    return findFirstIdentifier(first);
  }

  if (isIdentifier(first)) {
    return first;
  }

  return findFirstIdentifier(first);
};

const collectAssignmentDefinitions = (
  node,
  definitions,
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
    const left =
      getAssignmentLeftNode(node);

    if (left) {
      definitions.push(
        createDefinition({
          node: left,
          kind: 'variable',
        }),
      );
    }

    return;
  }

  for (const child of getChildren(node)) {
    collectAssignmentDefinitions(
      child,
      definitions,
    );
  }
};

const removeDuplicateDefinitions = (
  definitions,
) => {
  const seen = new Set();
  const result = [];

  for (const definition of definitions) {
    const key = [
      definition.name,
      definition.startIndex,
      definition.endIndex,
      definition.kind,
    ].join(':');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(definition);
  }

  return result;
};

const getNodeDefinitions = (
  node,
) => {
  if (!node) {
    return [];
  }

  const definitions = [];

  collectDeclarationDefinitions(
    node,
    definitions,
  );

  collectAssignmentDefinitions(
    node,
    definitions,
  );

  return removeDuplicateDefinitions(
    definitions,
  );
};

export {
  ASSIGNMENT_OPERATORS,
  isAssignmentOperator,
  getNodeDefinitions,
};

export default getNodeDefinitions;