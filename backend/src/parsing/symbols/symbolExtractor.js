import {
  SYMBOL_KINDS,
  REFERENCE_KINDS,
  SCOPE_KINDS,
  SymbolTable,
} from './symbolTable.js';

const getChildren = (
  node,
) => {
  return Array.isArray(node?.children)
    ? node.children
    : [];
};

const getNodeLocation = (
  node,
) => {
  if (!node) {
    return null;
  }

  return {
    start: node.start || null,
    end: node.end || null,
    startIndex:
      Number.isInteger(node.startIndex)
        ? node.startIndex
        : null,
    endIndex:
      Number.isInteger(node.endIndex)
        ? node.endIndex
        : null,
  };
};

const isIdentifier = (
  node,
) => {
  return (
    node?.type === 'identifier' ||
    node?.type === 'property_identifier'
  );
};

const getIdentifierName = (
  node,
) => {
  if (
    !node ||
    typeof node.text !== 'string'
  ) {
    return null;
  }

  const value =
    node.text.trim();

  if (!value) {
    return null;
  }

  if (
    !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(
      value,
    )
  ) {
    return null;
  }

  return value;
};

const isJavaScriptFamily = (
  language,
) => {
  return [
    'javascript',
    'typescript',
    'tsx',
  ].includes(
    String(language || '').toLowerCase(),
  );
};

const isFunctionNode = (
  node,
) => {
  return [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
  ].includes(
    node?.type,
  );
};

const isClassNode = (
  node,
) => {
  return [
    'class_declaration',
    'class',
  ].includes(
    node?.type,
  );
};

const isVariableDeclaration = (
  node,
) => {
  return (
    node?.type ===
    'lexical_declaration' ||
    node?.type ===
    'variable_declaration'
  );
};

const isVariableDeclarator = (
  node,
) => {
  return (
    node?.type ===
    'variable_declarator'
  );
};

const isImportStatement = (
  node,
) => {
  return (
    node?.type ===
    'import_statement'
  );
};

const isBlockScope = (
  node,
) => {
  return [
    'statement_block',
    'block',
    'for_statement',
    'for_in_statement',
    'for_of_statement',
    'catch_clause',
  ].includes(
    node?.type,
  );
};

const getScopeKind = (
  node,
) => {
  if (
    node?.type ===
    'catch_clause'
  ) {
    return SCOPE_KINDS.CATCH;
  }

  if (
    [
      'for_statement',
      'for_in_statement',
      'for_of_statement',
    ].includes(node?.type)
  ) {
    return SCOPE_KINDS.LOOP;
  }

  return SCOPE_KINDS.BLOCK;
};

const findDirectIdentifier = (
  node,
) => {
  return getChildren(node).find(
    (child) =>
      child.type === 'identifier',
  ) || null;
};

const findParameterContainer = (
  node,
) => {
  return getChildren(node).find(
    (child) =>
      [
        'formal_parameters',
        'parameters',
        'required_parameters',
      ].includes(child.type),
  ) || null;
};

const getDeclarationKind = (
  node,
) => {
  if (!node) {
    return null;
  }

  if (
    node.type ===
    'lexical_declaration'
  ) {
    const declarationText =
      typeof node.text === 'string'
        ? node.text.trim()
        : '';

    if (
      declarationText.startsWith(
        'const ',
      )
    ) {
      return 'const';
    }

    if (
      declarationText.startsWith(
        'let ',
      )
    ) {
      return 'let';
    }
  }

  if (
    node.type ===
    'variable_declaration'
  ) {
    return 'var';
  }

  return null;
};

const getVariableKind = (
  declarationKind,
) => {
  if (
    declarationKind ===
    'const'
  ) {
    return SYMBOL_KINDS.CONSTANT;
  }

  return SYMBOL_KINDS.VARIABLE;
};

const defineIdentifier = ({
  table,
  node,
  kind,
  metadata = {},
}) => {
  const name =
    getIdentifierName(node);

  if (!name) {
    return null;
  }

  return table.defineSymbol({
    name,
    kind,
    node: getNodeLocation(node),
    metadata,
  });
};

const extractPatternIdentifiers = ({
  table,
  node,
  kind,
  metadata = {},
}) => {
  if (!node) {
    return;
  }

  if (isIdentifier(node)) {
    defineIdentifier({
      table,
      node,
      kind,
      metadata,
    });

    return;
  }

  for (
    const child of getChildren(node)
  ) {
    extractPatternIdentifiers({
      table,
      node: child,
      kind,
      metadata,
    });
  }
};

const extractParameters = ({
  table,
  node,
}) => {
  const container =
    findParameterContainer(node);

  if (!container) {
    return;
  }

  for (
    const parameter
    of getChildren(container)
  ) {
    extractPatternIdentifiers({
      table,
      node: parameter,
      kind:
        SYMBOL_KINDS.PARAMETER,
    });
  }
};

const extractVariableDeclarator = ({
  table,
  node,
  declarationKind,
}) => {
  const kind =
    getVariableKind(
      declarationKind,
    );

  const identifier =
    findDirectIdentifier(node);

  if (identifier) {
    defineIdentifier({
      table,
      node: identifier,
      kind,
      metadata: {
        declarationType:
          node.type,
        declarationKind,
      },
    });

    return;
  }

  const firstChild =
    getChildren(node)[0];

  extractPatternIdentifiers({
    table,
    node: firstChild,
    kind,
    metadata: {
      declarationType:
        node.type,
      declarationKind,
    },
  });
};

const extractVariableDeclaration = ({
  table,
  node,
}) => {
  const declarationKind =
    getDeclarationKind(node);

  for (
    const child of getChildren(node)
  ) {
    if (
      isVariableDeclarator(child)
    ) {
      extractVariableDeclarator({
        table,
        node: child,
        declarationKind,
      });
    }
  }
};

const extractFunction = ({
  table,
  node,
  language,
}) => {
  const nameNode =
    findDirectIdentifier(node);

  if (nameNode) {
    defineIdentifier({
      table,
      node: nameNode,
      kind:
        node.type ===
        'method_definition'
          ? SYMBOL_KINDS.METHOD
          : SYMBOL_KINDS.FUNCTION,
      metadata: {
        declarationType:
          node.type,
      },
    });
  }

  table.enterScope({
    kind:
      SCOPE_KINDS.FUNCTION,
    node:
      getNodeLocation(node),
  });

  extractParameters({
    table,
    node,
  });

  for (
    const child of getChildren(node)
  ) {
    if (
      child === nameNode ||
      [
        'formal_parameters',
        'parameters',
        'required_parameters',
      ].includes(child.type)
    ) {
      continue;
    }

    visitNode({
      table,
      node: child,
      language,
      context: {
        role: 'function_body',
      },
    });
  }

  table.leaveScope();
};

const extractClass = ({
  table,
  node,
  language,
}) => {
  const nameNode =
    findDirectIdentifier(node);

  if (nameNode) {
    defineIdentifier({
      table,
      node: nameNode,
      kind:
        SYMBOL_KINDS.CLASS,
      metadata: {
        declarationType:
          node.type,
      },
    });
  }

  table.enterScope({
    kind:
      SCOPE_KINDS.CLASS,
    node:
      getNodeLocation(node),
  });

  for (
    const child of getChildren(node)
  ) {
    if (child === nameNode) {
      continue;
    }

    visitNode({
      table,
      node: child,
      language,
      context: {
        role: 'class_body',
      },
    });
  }

  table.leaveScope();
};

const extractImport = ({
  table,
  node,
}) => {
  for (
    const child of getChildren(node)
  ) {
    extractImportIdentifiers({
      table,
      node: child,
    });
  }
};

const extractImportIdentifiers = ({
  table,
  node,
}) => {
  if (!node) {
    return;
  }

  if (isIdentifier(node)) {
    defineIdentifier({
      table,
      node,
      kind:
        SYMBOL_KINDS.IMPORT,
      metadata: {
        declarationType:
          'import',
      },
    });

    return;
  }

  for (
    const child of getChildren(node)
  ) {
    extractImportIdentifiers({
      table,
      node: child,
    });
  }
};

const isDeclarationIdentifier = ({
  context,
}) => {
  return Boolean(
    context?.isDeclaration,
  );
};

const isPropertyPosition = ({
  node,
  context,
}) => {
  if (
    context?.role ===
    'property_name'
  ) {
    return true;
  }

  return (
    node?.type ===
    'property_identifier'
  );
};

const getReferenceKind = ({
  context,
}) => {
  if (
    context?.role ===
    'call'
  ) {
    return REFERENCE_KINDS.CALL;
  }

  if (
    context?.role ===
    'type'
  ) {
    return REFERENCE_KINDS.TYPE;
  }

  return REFERENCE_KINDS.READ;
};

const extractReference = ({
  table,
  node,
  context,
}) => {
  if (!isIdentifier(node)) {
    return;
  }

  if (
    isDeclarationIdentifier({
      context,
    })
  ) {
    return;
  }

  if (
    isPropertyPosition({
      node,
      context,
    })
  ) {
    return;
  }

  const name =
    getIdentifierName(node);

  if (!name) {
    return;
  }

  table.addReference({
    name,
    node:
      getNodeLocation(node),
    kind:
      getReferenceKind({
        context,
      }),
  });
};

const getChildContext = ({
  node,
  child,
  context,
}) => {
  const baseContext = {
    ...context,
  };

  if (
    isVariableDeclaration(node)
  ) {
    const declarationKind =
      getDeclarationKind(node);

    return {
      ...baseContext,
      declarationKind,
    };
  }

  if (
    isVariableDeclarator(node)
  ) {
    const identifier =
      findDirectIdentifier(node);

    if (child === identifier) {
      return {
        ...baseContext,
        isDeclaration: true,
      };
    }
  }

  if (
    [
      'member_expression',
      'object',
      'pair',
    ].includes(node.type)
  ) {
    const children =
      getChildren(node);

    if (
      children.length > 0 &&
      child === children.at(-1)
    ) {
      return {
        ...baseContext,
        role: 'property_name',
      };
    }
  }

  if (
    [
      'call_expression',
      'new_expression',
    ].includes(node.type)
  ) {
    const firstChild =
      getChildren(node)[0];

    if (child === firstChild) {
      return {
        ...baseContext,
        role: 'call',
      };
    }
  }

  return baseContext;
};

const visitNode = ({
  table,
  node,
  language,
  context = {},
}) => {
  if (!node) {
    return;
  }

  if (!isJavaScriptFamily(language)) {
    visitGenericNode({
      table,
      node,
      language,
      context,
    });

    return;
  }

  if (isFunctionNode(node)) {
    extractFunction({
      table,
      node,
      language,
    });

    return;
  }

  if (isClassNode(node)) {
    extractClass({
      table,
      node,
      language,
    });

    return;
  }

  if (isImportStatement(node)) {
    extractImport({
      table,
      node,
    });
  }

  if (isVariableDeclaration(node)) {
    extractVariableDeclaration({
      table,
      node,
    });
  }

  if (isIdentifier(node)) {
    extractReference({
      table,
      node,
      context,
    });
  }

  if (isBlockScope(node)) {
    table.enterScope({
      kind:
        getScopeKind(node),
      node:
        getNodeLocation(node),
    });

    for (
      const child of getChildren(node)
    ) {
      visitNode({
        table,
        node: child,
        language,
        context:
          getChildContext({
            node,
            child,
            context,
          }),
      });
    }

    table.leaveScope();

    return;
  }

  for (
    const child of getChildren(node)
  ) {
    visitNode({
      table,
      node: child,
      language,
      context:
        getChildContext({
          node,
          child,
          context,
        }),
    });
  }
};

const visitGenericNode = ({
  table,
  node,
  language,
  context = {},
}) => {
  if (!node) {
    return;
  }

  if (isIdentifier(node)) {
    extractReference({
      table,
      node,
      context,
    });
  }

  for (
    const child of getChildren(node)
  ) {
    visitGenericNode({
      table,
      node: child,
      language,
      context,
    });
  }
};

const extractSymbols = ({
  ast,
  filePath = null,
  language = null,
}) => {
  if (!ast) {
    return null;
  }

  const table =
    new SymbolTable({
      filePath,
      language,
    });

  visitNode({
    table,
    node: ast,
    language,
    context: {},
  });

  return table;
};

const extractSymbolsFromParsedFile = (
  parsedFile,
) => {
  if (
    !parsedFile ||
    typeof parsedFile !== 'object'
  ) {
    return null;
  }

  if (!parsedFile.ast) {
    return null;
  }

  return extractSymbols({
    ast: parsedFile.ast,
    filePath:
      parsedFile.path || null,
    language:
      parsedFile.language || null,
  });
};

export {
  extractSymbols,
  extractSymbolsFromParsedFile,
};

export default extractSymbols;