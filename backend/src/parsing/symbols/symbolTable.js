const SYMBOL_KINDS = Object.freeze({
  VARIABLE: 'variable',
  CONSTANT: 'constant',
  FUNCTION: 'function',
  CLASS: 'class',
  PARAMETER: 'parameter',
  IMPORT: 'import',
  METHOD: 'method',
  TYPE: 'type',
  INTERFACE: 'interface',
  ENUM: 'enum',
});

const REFERENCE_KINDS = Object.freeze({
  READ: 'read',
  WRITE: 'write',
  CALL: 'call',
  TYPE: 'type',
  UNKNOWN: 'unknown',
});

const SCOPE_KINDS = Object.freeze({
  GLOBAL: 'global',
  FUNCTION: 'function',
  BLOCK: 'block',
  CLASS: 'class',
  LOOP: 'loop',
  CATCH: 'catch',
});

class SymbolScope {
  constructor({
    id,
    kind,
    parent = null,
    node = null,
  }) {
    this.id = id;
    this.kind = kind;
    this.parent = parent;
    this.node = node;
    this.symbols = new Map();
    this.children = [];
  }

  define(symbol) {
    if (
      !symbol ||
      typeof symbol.name !== 'string' ||
      !symbol.name
    ) {
      return false;
    }

    if (this.symbols.has(symbol.name)) {
      return false;
    }

    this.symbols.set(
      symbol.name,
      symbol,
    );

    return true;
  }

  getOwn(name) {
    if (
      typeof name !== 'string' ||
      !name
    ) {
      return null;
    }

    return this.symbols.get(name) || null;
  }

  resolve(name) {
    if (
      typeof name !== 'string' ||
      !name
    ) {
      return null;
    }

    let current = this;

    while (current) {
      const symbol =
        current.getOwn(name);

      if (symbol) {
        return symbol;
      }

      current = current.parent;
    }

    return null;
  }

  addChild(scope) {
    if (!(scope instanceof SymbolScope)) {
      return false;
    }

    this.children.push(scope);

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      kind: this.kind,
      symbols: [
        ...this.symbols.values(),
      ],
      children: this.children.map(
        (child) => child.toJSON(),
      ),
    };
  }
}

class SymbolTable {
  constructor({
    filePath = null,
    language = null,
  } = {}) {
    this.filePath = filePath;
    this.language = language;

    this.scopeCounter = 0;
    this.symbolCounter = 0;
    this.referenceCounter = 0;

    this.scopes = new Map();
    this.symbols = new Map();
    this.references = [];

    this.globalScope =
      this.createScope({
        kind: SCOPE_KINDS.GLOBAL,
        node: null,
        parent: null,
      });

    this.currentScope =
      this.globalScope;
  }

  createScope({
    kind,
    node = null,
    parent = null,
  }) {
    const scopeId =
      `scope-${++this.scopeCounter}`;

    const scope =
      new SymbolScope({
        id: scopeId,
        kind,
        parent,
        node,
      });

    this.scopes.set(
      scopeId,
      scope,
    );

    if (parent) {
      parent.addChild(scope);
    }

    return scope;
  }

  enterScope({
    kind,
    node = null,
  }) {
    const scope =
      this.createScope({
        kind,
        node,
        parent: this.currentScope,
      });

    this.currentScope = scope;

    return scope;
  }

  leaveScope() {
    if (this.currentScope.parent) {
      this.currentScope =
        this.currentScope.parent;
    }

    return this.currentScope;
  }

  defineSymbol({
    name,
    kind,
    node = null,
    metadata = {},
    scope = this.currentScope,
  }) {
    if (
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return null;
    }

    const normalizedName =
      name.trim();

    const existing =
      scope.getOwn(normalizedName);

    if (existing) {
      return existing;
    }

    const symbolId =
      `symbol-${++this.symbolCounter}`;

    const symbol = {
      id: symbolId,
      name: normalizedName,
      kind,
      filePath: this.filePath,
      language: this.language,
      scopeId: scope.id,
      start: node?.start || null,
      end: node?.end || null,
      startIndex:
        Number.isInteger(node?.startIndex)
          ? node.startIndex
          : null,
      endIndex:
        Number.isInteger(node?.endIndex)
          ? node.endIndex
          : null,
      metadata: {
        ...metadata,
      },
      references: [],
    };

    scope.define(symbol);

    this.symbols.set(
      symbolId,
      symbol,
    );

    return symbol;
  }

  addReference({
    name,
    node = null,
    kind = REFERENCE_KINDS.UNKNOWN,
    scope = this.currentScope,
  }) {
    if (
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return null;
    }

    const normalizedName =
      name.trim();

    const resolved =
      scope.resolve(
        normalizedName,
      );

    const referenceId =
      `reference-${++this.referenceCounter}`;

    const reference = {
      id: referenceId,
      name: normalizedName,
      kind,
      filePath: this.filePath,
      language: this.language,
      scopeId: scope.id,
      symbolId:
        resolved?.id || null,
      resolved:
        Boolean(resolved),
      start: node?.start || null,
      end: node?.end || null,
      startIndex:
        Number.isInteger(node?.startIndex)
          ? node.startIndex
          : null,
      endIndex:
        Number.isInteger(node?.endIndex)
          ? node.endIndex
          : null,
    };

    this.references.push(
      reference,
    );

    if (resolved) {
      resolved.references.push(
        referenceId,
      );
    }

    return reference;
  }

  resolve(name) {
    return this.currentScope.resolve(
      name,
    );
  }

  getSymbols() {
    return [
      ...this.symbols.values(),
    ];
  }

  getReferences() {
    return [
      ...this.references,
    ];
  }

  getScopes() {
    return [
      ...this.scopes.values(),
    ];
  }

  getUnresolvedReferences() {
    return this.references.filter(
      (reference) =>
        !reference.resolved,
    );
  }

  toJSON() {
    return {
      filePath: this.filePath,
      language: this.language,

      scopeTree:
        this.globalScope.toJSON(),

      symbols:
        this.getSymbols(),

      references:
        this.getReferences(),

      unresolvedReferences:
        this.getUnresolvedReferences(),
    };
  }
}

export {
  SYMBOL_KINDS,
  REFERENCE_KINDS,
  SCOPE_KINDS,
  SymbolScope,
  SymbolTable,
};

export default SymbolTable;