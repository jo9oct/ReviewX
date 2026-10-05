const DECLARATION_TYPES = new Set([
  'function_declaration',
  'function',
  'function_definition',
  'arrow_function',
  'method_definition',
  'method',
  'class_declaration',
  'class',
  'variable_declarator',
  'interface_declaration',
  'type_alias_declaration',
  'parameter',
  'import_specifier',
]);

const SCOPE_TYPES = new Set([
  'function_declaration',
  'function',
  'function_definition',
  'arrow_function',
  'method_definition',
  'method',
  'class_declaration',
  'class',
]);

const PARAMETER_CONTAINER_TYPES = new Set([
  'formal_parameters',
  'parameters',
]);

const getNodeType = node => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  return node.type || node.nodeType || null;
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

  if (typeof node.identifier === 'string') {
    return node.identifier;
  }

  return null;
};

const getNodeName = node => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const directCandidates = [
    node.name,
    node.identifier,
    node.value,
    node.property,
    node.key,
  ];

  for (const candidate of directCandidates) {
    if (
      typeof candidate === 'string' &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  const type = getNodeType(node);

  if (
    type === 'identifier' ||
    type === 'property_identifier'
  ) {
    if (
      typeof node.text === 'string' &&
      node.text.trim()
    ) {
      return node.text.trim();
    }
  }

  return null;
};

const getChildren = node => {
  if (!node || typeof node !== 'object') {
    return [];
  }

  const candidates = [
    node.namedChildren,
    node.children,
    node.body,
    node.declarations,
    node.parameters,
    node.arguments,
    node.expression,
    node.left,
    node.right,
    node.callee,
    node.object,
    node.property,
    node.value,
  ];

  const children = [];
  const seen = new Set();

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const child of candidate) {
        if (
          child &&
          typeof child === 'object' &&
          !seen.has(child)
        ) {
          seen.add(child);
          children.push(child);
        }
      }

      continue;
    }

    if (
      candidate &&
      typeof candidate === 'object' &&
      !seen.has(candidate)
    ) {
      seen.add(candidate);
      children.push(candidate);
    }
  }

  return children;
};

const getPosition = node => ({
  start: {
    row: node?.start?.row ?? 0,
    column: node?.start?.column ?? 0,
  },
  end: {
    row: node?.end?.row ?? 0,
    column: node?.end?.column ?? 0,
  },
});

const createSymbol = ({
  file,
  node,
  name,
  type,
  scopeId,
}) => ({
  id: `${file.path}:${name}:${node?.startIndex ?? node?.start?.row ?? 0}:${node?.startIndex ?? node?.start?.column ?? 0}`,
  name,
  type,
  nodeType: getNodeType(node),
  text: getNodeText(node),
  filePath: file.path,
  scopeId,
  start: getPosition(node).start,
  end: getPosition(node).end,
  startIndex: Number.isInteger(node?.startIndex)
    ? node.startIndex
    : null,
  endIndex: Number.isInteger(node?.endIndex)
    ? node.endIndex
    : null,
});

const createScopeRecord = ({
  id,
  type,
  parentId,
}) => ({
  id,
  type,
  parentId,
  symbols: new Set(),
});

const cloneScope = scope => ({
  id: scope.id,
  type: scope.type,
  parentId: scope.parentId,
  symbols: new Set(scope.symbols),
});

const SymbolTable = () => {
  const scopes = new Map();
  const symbols = new Map();

  let lastBuildResult = {
    scopes: [],
    symbols: [],
  };

  const createScope = ({
    id,
    type = 'block',
    parentId = null,
  }) => {
    if (
      typeof id !== 'string' ||
      !id.trim()
    ) {
      return null;
    }

    if (scopes.has(id)) {
      return scopes.get(id);
    }

    const scope = createScopeRecord({
      id,
      type,
      parentId,
    });

    scopes.set(id, scope);

    return scope;
  };

  const addSymbol = ({
    file,
    node,
    name,
    type = 'variable',
    scopeId,
  }) => {
    if (
      !file ||
      typeof file.path !== 'string' ||
      !node ||
      typeof name !== 'string' ||
      !name.trim() ||
      typeof scopeId !== 'string' ||
      !scopeId.trim()
    ) {
      return null;
    }

    const normalizedName = name.trim();

    const symbol = createSymbol({
      file,
      node,
      name: normalizedName,
      type,
      scopeId,
    });

    const existing = symbols.get(symbol.id);

    if (existing) {
      return existing;
    }

    symbols.set(
      symbol.id,
      symbol,
    );

    const scope = scopes.get(scopeId);

    if (scope) {
      scope.symbols.add(symbol.id);
    }

    return symbol;
  };

  const resolve = (
    name,
    scopeId,
  ) => {
    if (
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return null;
    }

    let currentScopeId = scopeId;

    while (currentScopeId) {
      const scope = scopes.get(currentScopeId);

      if (!scope) {
        break;
      }

      for (const symbolId of scope.symbols) {
        const symbol = symbols.get(symbolId);

        if (
          symbol &&
          symbol.name === name
        ) {
          return symbol;
        }
      }

      currentScopeId = scope.parentId;
    }

    return null;
  };

  const findIdentifierChild = node => {
    const children = getChildren(node);

    return children.find(child => {
      const type = getNodeType(child);

      return (
        type === 'identifier' ||
        type === 'property_identifier'
      );
    });
  };

  const getDeclarationName = node => {
    const type = getNodeType(node);

    if (type === 'variable_declarator') {
      const identifier = findIdentifierChild(node);

      return (
        getNodeName(identifier) ||
        null
      );
    }

    if (
      type === 'function_declaration' ||
      type === 'function_definition' ||
      type === 'class_declaration' ||
      type === 'interface_declaration' ||
      type === 'type_alias_declaration'
    ) {
      const identifier = findIdentifierChild(node);

      return (
        getNodeName(identifier) ||
        null
      );
    }

    if (
      type === 'method_definition' ||
      type === 'method'
    ) {
      const identifier = findIdentifierChild(node);

      return (
        getNodeName(identifier) ||
        null
      );
    }

    if (type === 'import_specifier') {
      const identifier = findIdentifierChild(node);

      return (
        getNodeName(identifier) ||
        null
      );
    }

    if (type === 'parameter') {
      return getNodeName(node);
    }

    return null;
  };

  const addDeclaration = ({
    file,
    node,
    scopeId,
  }) => {
    const type = getNodeType(node);

    if (!DECLARATION_TYPES.has(type)) {
      return null;
    }

    if (
      PARAMETER_CONTAINER_TYPES.has(type)
    ) {
      return null;
    }

    const name = getDeclarationName(node);

    if (!name) {
      return null;
    }

    let symbolType = 'variable';

    if (
      type === 'function_declaration' ||
      type === 'function' ||
      type === 'function_definition' ||
      type === 'arrow_function' ||
      type === 'method_definition' ||
      type === 'method'
    ) {
      symbolType = 'function';
    } else if (
      type === 'class_declaration' ||
      type === 'class'
    ) {
      symbolType = 'class';
    } else if (
      type === 'parameter'
    ) {
      symbolType = 'parameter';
    } else if (
      type === 'import_specifier'
    ) {
      symbolType = 'import';
    }

    return addSymbol({
      file,
      node,
      name,
      type: symbolType,
      scopeId,
    });
  };

  const build = ({
    file,
    ast,
  }) => {
    scopes.clear();
    symbols.clear();

    lastBuildResult = {
      scopes: [],
      symbols: [],
    };

    if (
      !file ||
      typeof file !== 'object' ||
      typeof file.path !== 'string'
    ) {
      return lastBuildResult;
    }

    if (
      !ast ||
      typeof ast !== 'object'
    ) {
      return lastBuildResult;
    }

    const rootScopeId = `file:${file.path}`;

    createScope({
      id: rootScopeId,
      type: 'file',
      parentId: null,
    });

    let functionScopeIndex = 0;

    const visit = (
      node,
      currentScopeId,
    ) => {
      if (
        !node ||
        typeof node !== 'object'
      ) {
        return;
      }

      const nodeType = getNodeType(node);

      let activeScopeId =
        currentScopeId;

      const isScope =
        SCOPE_TYPES.has(nodeType);

      if (isScope) {
        const scopeId =
          `${rootScopeId}:${nodeType}:${functionScopeIndex}`;

        functionScopeIndex += 1;

        createScope({
          id: scopeId,
          type: 'function',
          parentId: currentScopeId,
        });

        activeScopeId = scopeId;
      }

      if (
        DECLARATION_TYPES.has(nodeType) &&
        nodeType !== 'parameter'
      ) {
        addDeclaration({
          file,
          node,
          scopeId: currentScopeId,
        });
      }

      if (
        PARAMETER_CONTAINER_TYPES.has(nodeType)
      ) {
        for (const parameter of getChildren(node)) {
          const parameterType =
            getNodeType(parameter);

          if (
            parameterType === 'identifier' ||
            parameterType === 'required_parameter' ||
            parameterType === 'optional_parameter' ||
            parameterType === 'parameter'
          ) {
            const parameterName =
              getNodeName(parameter);

            if (parameterName) {
              addSymbol({
                file,
                node: parameter,
                name: parameterName,
                type: 'parameter',
                scopeId: activeScopeId,
              });
            }
          }
        }
      }

      for (const child of getChildren(node)) {
        visit(
          child,
          activeScopeId,
        );
      }
    };

    visit(
      ast,
      rootScopeId,
    );

    lastBuildResult = {
      scopes: [...scopes.values()].map(cloneScope),
      symbols: [...symbols.values()],
    };

    return {
      scopes: [...lastBuildResult.scopes].map(cloneScope),
      symbols: [...lastBuildResult.symbols],
    };
  };

  const getScopes = () =>
    lastBuildResult.scopes.map(cloneScope);

  const getSymbols = () =>
    [...lastBuildResult.symbols];

  return {
    createScope,
    addSymbol,
    resolve,
    build,
    getScopes,
    getSymbols,
  };
};

export {
  SymbolTable,
  DECLARATION_TYPES,
  SCOPE_TYPES,
};

export default SymbolTable;