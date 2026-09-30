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

  if (typeof node.identifier === 'string') {
    return node.identifier;
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

const normalizeName = value => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
};

const normalizeIdentifier = value => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
};

const getLocation = node => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.location) {
    return node.location;
  }

  if (node.loc) {
    return node.loc;
  }

  if (node.start && typeof node.start === 'object') {
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

const getDescriptor = (
  file,
  node,
  nameOverride = null,
) => ({
  filePath:
    file?.path || 'source',

  name:
    nameOverride ||
    getNodeText(node) ||
    getNodeType(node) ||
    'unknown',

  nodeType:
    getNodeType(node),

  location:
    getLocation(node),
});

const isIdentifierNode = node => {
  const type =
    normalizeName(
      getNodeType(node),
    );

  return (
    type === 'identifier' ||
    type === 'property_identifier' ||
    type ===
      'shorthand_property_identifier_pattern'
  );
};

const isMemberExpression = node => {
  const type =
    normalizeName(
      getNodeType(node),
    );

  return (
    type === 'member_expression' ||
    type === 'member_expression_pattern'
  );
};

const isCallExpression = node => {
  const type =
    normalizeName(
      getNodeType(node),
    );

  return (
    type === 'call_expression' ||
    type === 'new_expression'
  );
};

const isAssignmentNode = node => {
  const type =
    normalizeName(
      getNodeType(node),
    );

  return (
    type === 'assignment_expression' ||
    type === 'variable_declarator'
  );
};

const getExpressionPath = node => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (isIdentifierNode(node)) {
    return normalizeIdentifier(
      getNodeText(node),
    );
  }

  if (isMemberExpression(node)) {
    const children =
      getChildren(node);

    if (children.length < 2) {
      return normalizeIdentifier(
        getNodeText(node),
      );
    }

    const objectPath =
      getExpressionPath(
        children[0],
      );

    const property =
      normalizeIdentifier(
        getNodeText(
          children[
            children.length - 1
          ],
        ),
      );

    if (!property) {
      return objectPath;
    }

    if (!objectPath) {
      return property;
    }

    return `${objectPath}.${property}`;
  }

  const type =
    normalizeName(
      getNodeType(node),
    );

  if (
    type ===
    'parenthesized_expression'
  ) {
    return getExpressionPath(
      getChildren(node)[0],
    );
  }

  return null;
};

const getMemberPropertyName = node => {
  if (!isMemberExpression(node)) {
    return null;
  }

  const children =
    getChildren(node);

  if (!children.length) {
    return null;
  }

  return normalizeName(
    getNodeText(
      children[
        children.length - 1
      ],
    ),
  );
};

const getMemberObject = node => {
  if (!isMemberExpression(node)) {
    return null;
  }

  return getChildren(node)[0] || null;
};

const getCallCallee = node => {
  if (!isCallExpression(node)) {
    return null;
  }

  return getChildren(node)[0] || null;
};

const getCallCalleeName = node => {
  const callee =
    getCallCallee(node);

  if (!callee) {
    return null;
  }

  return normalizeName(
    getExpressionPath(callee) ||
    getNodeText(callee),
  );
};

const getCallArguments = node => {
  if (!isCallExpression(node)) {
    return [];
  }

  const children =
    getChildren(node);

  if (children.length < 2) {
    return [];
  }

  const argumentContainer =
    children[1];

  const argumentContainerType =
    normalizeName(
      getNodeType(
        argumentContainer,
      ),
    );

  if (
    argumentContainerType ===
      'arguments' ||
    argumentContainerType ===
      'argument_list'
  ) {
    return getChildren(
      argumentContainer,
    );
  }

  return children.slice(1);
};

const collectDescendants = node => {
  const result = [];
  const visited = new WeakSet();

  const visit = current => {
    if (
      !current ||
      typeof current !== 'object'
    ) {
      return;
    }

    if (visited.has(current)) {
      return;
    }

    visited.add(current);
    result.push(current);

    for (
      const child of
      getChildren(current)
    ) {
      visit(child);
    }
  };

  visit(node);

  return result;
};

const collectIdentifiers = node => {
  const identifiers = [];

  for (
    const descendant of
    collectDescendants(node)
  ) {
    if (
      !isIdentifierNode(
        descendant,
      )
    ) {
      continue;
    }

    const name =
      normalizeIdentifier(
        getNodeText(
          descendant,
        ),
      );

    if (!name) {
      continue;
    }

    identifiers.push({
      name,
      node: descendant,
    });
  }

  return identifiers;
};

const getAssignmentParts = node => {
  if (!isAssignmentNode(node)) {
    return null;
  }

  const children =
    getChildren(node);

  if (children.length < 2) {
    return null;
  }

  const left =
    children[0];

  const right =
    children[
      children.length - 1
    ];

  const target =
    getExpressionPath(left);

  if (!target) {
    return null;
  }

  return {
    target,
    left,
    right,
  };
};

const SOURCE_MEMBER_PATTERNS =
  new Set([
    'query',
    'params',
    'body',
    'headers',
    'cookies',
    'cookie',
    'form',
    'search',
  ]);

const SOURCE_ROOT_NAMES =
  new Set([
    'request',
    'req',
    'argv',
  ]);

const SINK_CALL_NAMES =
  new Set([
    'eval',
    'exec',
    'execsync',
    'execute',
    'executemany',
    'spawn',
    'writefile',
    'readfile',
    'unlink',

    /*
     * Direct HTTP request APIs.
     */
    'fetch',
  ]);

const SINK_MEMBER_CALL_NAMES =
  new Set([
    /*
     * Database sinks.
     */
    'query',
    'execute',
    'executemany',

    /*
     * File/system sinks.
     */
    'writefile',
    'readfile',
    'unlink',
    'spawn',

    /*
     * Express/HTTP response sinks.
     */
    'send',
    'end',
    'write',
  ]);

/*
 * HTTP clients whose member methods can perform
 * outbound server-side requests.
 *
 * The client name is checked together with the
 * method name. This is intentionally separate
 * from SINK_MEMBER_CALL_NAMES so unrelated calls
 * such as app.get() are not treated as HTTP sinks.
 */
const HTTP_CLIENT_METHODS = {
  axios: new Set([
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'request',
  ]),

  got: new Set([
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head',
    'request',
  ]),

  request: new Set([
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head',
    'request',
  ]),

  http: new Set([
    'get',
    'request',
  ]),

  https: new Set([
    'get',
    'request',
  ]),

  requests: new Set([
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'request',
  ]),
};

const isHttpRequestSink = callee => {
  const normalized =
    normalizeName(callee);

  if (!normalized) {
    return false;
  }

  /*
   * fetch(url)
   */
  if (
    normalized ===
    'fetch'
  ) {
    return true;
  }

  const segments =
    normalized.split('.');

  if (segments.length < 2) {
    return false;
  }

  const method =
    segments.at(-1);

  const client =
    segments.at(-2);

  const methods =
    HTTP_CLIENT_METHODS[
      client
    ];

  if (!methods) {
    return false;
  }

  return methods.has(
    method,
  );
};

const SANITIZER_NAMES =
  new Set([
    'sanitize',
    'escape',
    'encode',
    'validate',
    'parameterize',
  ]);

const createTaintAnalysis = () => {
  const sources = [];
  const sinks = [];
  const sanitizers = [];
  const flows = [];

  const createKey = value => {
    const location =
      value?.location;

    return [
      value?.type,
      value?.filePath,
      value?.name,
      location?.start?.line ?? 0,
      location?.start?.column ?? 0,
    ].join(':');
  };

  const addUnique = (
    collection,
    value,
  ) => {
    if (!value) {
      return;
    }

    const key =
      createKey(value);

    if (
      !collection.some(
        item =>
          createKey(item) === key,
      )
    ) {
      collection.push(value);
    }
  };

  const addSource = source => {
    if (!source) {
      return;
    }

    addUnique(
      sources,
      {
        ...source,
        type: 'source',
      },
    );
  };

  const addSink = sink => {
    if (!sink) {
      return;
    }

    addUnique(
      sinks,
      {
        ...sink,
        type: 'sink',
      },
    );
  };

  const addSanitizer =
    sanitizer => {
      if (!sanitizer) {
        return;
      }

      addUnique(
        sanitizers,
        {
          ...sanitizer,
          type: 'sanitizer',
        },
      );
    };

  const addFlow = flow => {
    if (
      !flow?.source ||
      !flow?.sink
    ) {
      return;
    }

    const key = [
      flow.filePath,
      flow.source.name,
      flow.source.location?.start
        ?.line ?? 0,
      flow.sink.name,
      flow.sink.location?.start
        ?.line ?? 0,
    ].join(':');

    if (
      flows.some(
        item =>
          [
            item.filePath,
            item.source?.name,
            item.source?.location?.start
              ?.line ?? 0,
            item.sink?.name,
            item.sink?.location?.start
              ?.line ?? 0,
          ].join(':') === key,
      )
    ) {
      return;
    }

    flows.push({
      ...flow,
      type: 'tainted-flow',
    });
  };

  return {
    addSource,
    addSink,
    addSanitizer,
    addFlow,

    getSources: () => [
      ...sources,
    ],

    getSinks: () => [
      ...sinks,
    ],

    getSanitizers: () => [
      ...sanitizers,
    ],

    getFlows: () => [
      ...flows,
    ],
  };
};

const getSourcePathInfo = node => {
  if (!isMemberExpression(node)) {
    return null;
  }

  const path =
    getExpressionPath(node);

  if (!path) {
    return null;
  }

  const segments =
    path.split('.');

  if (segments.length < 2) {
    return null;
  }

  const root =
    normalizeName(
      segments[0],
    );

  if (
    !SOURCE_ROOT_NAMES.has(root)
  ) {
    return null;
  }

  const sourceIndex =
    segments.findIndex(
      (segment, index) =>
        index > 0 &&
        SOURCE_MEMBER_PATTERNS.has(
          normalizeName(segment),
        ),
    );

  if (sourceIndex === -1) {
    return null;
  }

  return {
    path,
    root,
    sourceIndex,
  };
};

const findSourceExpression = node => {
  const info =
    getSourcePathInfo(node);

  if (!info) {
    return null;
  }

  return {
    path: info.path,
    node,
  };
};

const collectSourceExpressions = ({
  nodes,
  file,
  analysis,
}) => {
  const candidates = [];

  for (const node of nodes) {
    const source =
      findSourceExpression(node);

    if (!source?.path) {
      continue;
    }

    candidates.push({
      node,
      path: source.path,
    });
  }

  const sourcePaths =
    [
      ...new Set(
        candidates.map(
          candidate =>
            candidate.path,
        ),
      ),
    ];

  const selectedPaths =
    sourcePaths.filter(path => {
      const hasMoreSpecificPath =
        sourcePaths.some(
          other =>
            other !== path &&
            other.startsWith(
              `${path}.`,
            ),
        );

      return !hasMoreSpecificPath;
    });

  const sourceByPath =
    new Map();

  for (const candidate of candidates) {
    if (
      !selectedPaths.includes(
        candidate.path,
      )
    ) {
      continue;
    }

    const descriptor =
      getDescriptor(
        file,
        candidate.node,
        candidate.path,
      );

    analysis.addSource(
      descriptor,
    );

    sourceByPath.set(
      candidate.path,
      descriptor,
    );
  }

  return sourceByPath;
};

const getTaintOrigins = (
  variable,
  sourceByVariable,
) => {
  const origins =
    sourceByVariable.get(
      variable,
    );

  if (!origins) {
    return [];
  }

  if (Array.isArray(origins)) {
    return origins;
  }

  return [origins];
};

const addOrigin = ({
  variable,
  source,
  sourceByVariable,
}) => {
  if (
    !variable ||
    !source
  ) {
    return false;
  }

  const existing =
    getTaintOrigins(
      variable,
      sourceByVariable,
    );

  const alreadyExists =
    existing.some(
      item =>
        item === source ||
        (
          item?.name ===
            source?.name &&
          item?.filePath ===
            source?.filePath &&
          item?.location?.start
            ?.line ===
            source?.location?.start
              ?.line
        ),
    );

  if (alreadyExists) {
    return false;
  }

  sourceByVariable.set(
    variable,
    [
      ...existing,
      source,
    ],
  );

  return true;
};

const getExpressionTaintNames = node => {
  const names = new Set();

  const directPath =
    getExpressionPath(node);

  if (directPath) {
    names.add(
      directPath,
    );
  }

  for (
    const identifier of
    collectIdentifiers(node)
  ) {
    if (identifier.name) {
      names.add(
        identifier.name,
      );
    }
  }

  return names;
};

const propagateThroughAssignments = ({
  nodes,
  taintedVariables,
  sourceByVariable,
  sanitizerVariables,
}) => {
  let changed = true;

  while (changed) {
    changed = false;

    for (const node of nodes) {
      const assignment =
        getAssignmentParts(node);

      if (!assignment) {
        continue;
      }

      const paths =
        getExpressionTaintNames(
          assignment.right,
        );

      const taintedPaths =
        [...paths].filter(
          path =>
            taintedVariables.has(
              path,
            ) ||
            getTaintOrigins(
              path,
              sourceByVariable,
            ).length > 0,
        );

      if (!taintedPaths.length) {
        continue;
      }

      const target =
        assignment.target;

      if (!target) {
        continue;
      }

      if (
        !taintedVariables.has(
          target,
        )
      ) {
        taintedVariables.add(
          target,
        );

        changed = true;
      }

      for (
        const taintedPath of
        taintedPaths
      ) {
        for (
          const source of
          getTaintOrigins(
            taintedPath,
            sourceByVariable,
          )
        ) {
          if (
            addOrigin({
              variable: target,
              source,
              sourceByVariable,
            })
          ) {
            changed = true;
          }
        }

        if (
          sanitizerVariables.has(
            taintedPath,
          ) &&
          !sanitizerVariables.has(
            target,
          )
        ) {
          sanitizerVariables.add(
            target,
          );

          changed = true;
        }
      }
    }
  }
};

const propagateThroughDataFlow = ({
  dataFlow,
  taintedVariables,
  sourceByVariable,
}) => {
  if (
    !dataFlow ||
    typeof dataFlow !== 'object'
  ) {
    return;
  }

  const nodes =
    typeof dataFlow.getNodes ===
    'function'
      ? dataFlow.getNodes()
      : Array.isArray(
          dataFlow.nodes,
        )
        ? dataFlow.nodes
        : [];

  const edges =
    typeof dataFlow.getEdges ===
    'function'
      ? dataFlow.getEdges()
      : Array.isArray(
          dataFlow.edges,
        )
        ? dataFlow.edges
        : [];

  const nodeById =
    new Map(
      nodes
        .filter(
          node =>
            node &&
            typeof node ===
              'object',
        )
        .map(
          node => [
            node.id,
            node,
          ],
        ),
    );

  let changed = true;

  while (changed) {
    changed = false;

    for (const edge of edges) {
      if (
        !edge ||
        !nodeById.has(edge.from) ||
        !nodeById.has(edge.to)
      ) {
        continue;
      }

      const from =
        nodeById.get(
          edge.from,
        );

      const to =
        nodeById.get(
          edge.to,
        );

      const fromNames = [
        from.symbol,
        from.expression,
      ]
        .filter(
          value =>
            typeof value ===
            'string',
        )
        .map(
          value =>
            value.trim(),
        );

      const toNames = [
        to.symbol,
        to.expression,
      ]
        .filter(
          value =>
            typeof value ===
            'string',
        )
        .map(
          value =>
            value.trim(),
        );

      const taintedName =
        fromNames.find(
          name =>
            taintedVariables.has(
              name,
            ) ||
            getTaintOrigins(
              name,
              sourceByVariable,
            ).length > 0,
        );

      if (!taintedName) {
        continue;
      }

      for (const name of toNames) {
        if (
          !taintedVariables.has(
            name,
          )
        ) {
          taintedVariables.add(
            name,
          );

          changed = true;
        }

        for (
          const source of
          getTaintOrigins(
            taintedName,
            sourceByVariable,
          )
        ) {
          if (
            addOrigin({
              variable: name,
              source,
              sourceByVariable,
            })
          ) {
            changed = true;
          }
        }
      }
    }
  }
};

const containsTaintedValue = ({
  node,
  taintedVariables,
  sourceByVariable,
}) => {
  if (
    !node ||
    typeof node !== 'object'
  ) {
    return false;
  }

  const names =
    getExpressionTaintNames(
      node,
    );

  for (const name of names) {
    if (
      taintedVariables.has(name) ||
      getTaintOrigins(
        name,
        sourceByVariable,
      ).length > 0
    ) {
      return true;
    }
  }

  return false;
};

const buildTaintAnalysis = ({
  file,
  ast,
  dataFlow = null,
}) => {
  const analysis =
    createTaintAnalysis();

  if (
    !ast ||
    typeof ast !== 'object'
  ) {
    return {
      sources: [],
      sinks: [],
      sanitizers: [],
      flows: [],
    };
  }

  const nodes =
    collectDescendants(ast);

  const taintedVariables =
    new Set();

  const sourceByVariable =
    new Map();

  const sanitizerVariables =
    new Set();

  /*
   * 1. Detect external input sources.
   */
  const sourceByPath =
    collectSourceExpressions({
      nodes,
      file,
      analysis,
    });

  for (
    const [path, source] of
    sourceByPath
  ) {
    taintedVariables.add(
      path,
    );

    addOrigin({
      variable: path,
      source,
      sourceByVariable,
    });
  }

  /*
   * Mark source parent paths as tainted.
   */
  for (const path of sourceByPath.keys()) {
    const segments =
      path.split('.');

    for (
      let index = 2;
      index < segments.length;
      index += 1
    ) {
      const parentPath =
        segments
          .slice(0, index)
          .join('.');

      taintedVariables.add(
        parentPath,
      );

      const origins =
        getTaintOrigins(
          path,
          sourceByVariable,
        );

      for (const source of origins) {
        addOrigin({
          variable: parentPath,
          source,
          sourceByVariable,
        });
      }
    }
  }

  /*
   * 2. Detect sanitizers.
   */
  for (const node of nodes) {
    if (!isCallExpression(node)) {
      continue;
    }

    const callee =
      getCallCalleeName(node);

    if (!callee) {
      continue;
    }

    const normalized =
      normalizeName(callee);

    const lastSegment =
      normalized
        .split('.')
        .at(-1);

    if (
      !SANITIZER_NAMES.has(
        lastSegment,
      )
    ) {
      continue;
    }

    const descriptor =
      getDescriptor(
        file,
        node,
        callee,
      );

    analysis.addSanitizer(
      descriptor,
    );

    for (
      const argument of
      getCallArguments(node)
    ) {
      const argumentNames =
        getExpressionTaintNames(
          argument,
        );

      for (
        const argumentName of
        argumentNames
      ) {
        if (
          taintedVariables.has(
            argumentName,
          )
        ) {
          sanitizerVariables.add(
            argumentName,
          );
        }
      }
    }
  }

  /*
   * 3. Propagate assignments.
   */
  propagateThroughAssignments({
    nodes,
    taintedVariables,
    sourceByVariable,
    sanitizerVariables,
  });

  /*
   * 4. Propagate explicit data flow.
   */
  propagateThroughDataFlow({
    dataFlow,
    taintedVariables,
    sourceByVariable,
  });

  /*
   * Run assignment propagation again after
   * explicit DFG propagation.
   *
   * This allows:
   *
   * source -> DFG -> variable -> sink
   *
   * to resolve correctly.
   */
  propagateThroughAssignments({
    nodes,
    taintedVariables,
    sourceByVariable,
    sanitizerVariables,
  });

  /*
   * 5. Detect sinks and create flows.
   */
  for (const node of nodes) {
    if (!isCallExpression(node)) {
      continue;
    }

    const callee =
      getCallCalleeName(node);

    if (!callee) {
      continue;
    }

    const normalized =
      normalizeName(callee);

    const lastSegment =
      normalized
        .split('.')
        .at(-1);

    const isDirectSink =
      SINK_CALL_NAMES.has(
        normalized,
      );

    const isMemberSink =
      SINK_MEMBER_CALL_NAMES.has(
        lastSegment,
      );

    const isHttpSink =
      isHttpRequestSink(
        normalized,
      );

    if (
      !isDirectSink &&
      !isMemberSink &&
      !isHttpSink
    ) {
      continue;
    }

    const descriptor =
      getDescriptor(
        file,
        node,
        callee,
      );

    analysis.addSink(
      descriptor,
    );

    const argumentsList =
      getCallArguments(node);

    for (
      const argument of
      argumentsList
    ) {
      if (
        !containsTaintedValue({
          node: argument,
          taintedVariables,
          sourceByVariable,
        })
      ) {
        continue;
      }

      const candidateVariables =
        getExpressionTaintNames(
          argument,
        );

      for (
        const variable of
        candidateVariables
      ) {
        if (
          !taintedVariables.has(
            variable,
          ) &&
          !getTaintOrigins(
            variable,
            sourceByVariable,
          ).length
        ) {
          continue;
        }

        const origins =
          getTaintOrigins(
            variable,
            sourceByVariable,
          );

        for (
          const source of
          origins
        ) {
          if (!source) {
            continue;
          }

          analysis.addFlow({
            filePath:
              file?.path ||
              'source',

            source,

            sink:
              descriptor,

            sanitized:
              sanitizerVariables.has(
                variable,
              ),
          });
        }
      }
    }
  }

  return {
    sources:
      analysis.getSources(),

    sinks:
      analysis.getSinks(),

    sanitizers:
      analysis.getSanitizers(),

    flows:
      analysis.getFlows(),
  };
};

export {
  createTaintAnalysis,
  buildTaintAnalysis,
};

export default buildTaintAnalysis;