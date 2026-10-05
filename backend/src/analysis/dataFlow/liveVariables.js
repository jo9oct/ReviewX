const getGraphNodes = (
  graph,
) => {
  if (
    !graph ||
    typeof graph.getNodes !==
      'function'
  ) {
    return [];
  }

  const nodes =
    graph.getNodes();

  if (Array.isArray(nodes)) {
    return nodes;
  }

  if (nodes instanceof Map) {
    return [
      ...nodes.values(),
    ];
  }

  return [];
};

const getSuccessors = (
  graph,
  node,
) => {
  if (
    graph &&
    typeof graph.getSuccessors ===
      'function'
  ) {
    const successors =
      graph.getSuccessors(node);

    return Array.isArray(
      successors,
    )
      ? successors
      : [];
  }

  if (
    Array.isArray(node?.outgoing)
  ) {
    return node.outgoing
      .map(
        (edge) =>
          edge?.target,
      )
      .filter(Boolean);
  }

  return [];
};

const createUseKey = (
  nodeId,
  index,
) => {
  return `use-${nodeId}-${index + 1}`;
};

const getUsesForNode = (
  dataFlow,
  nodeId,
) => {
  const node =
    (
      dataFlow?.nodes || []
    ).find(
      (item) =>
        item.nodeId === nodeId,
    );

  if (!node) {
    return [];
  }

  return (
    node.uses || []
  ).map(
    (use, index) => ({
      id: createUseKey(
        nodeId,
        index,
      ),

      nodeId,

      name: use.name,

      kind: use.kind,

      startIndex:
        use.startIndex,

      endIndex:
        use.endIndex,
    }),
  );
};

const getDefinitionsForNode = (
  dataFlow,
  nodeId,
) => {
  const node =
    (
      dataFlow?.nodes || []
    ).find(
      (item) =>
        item.nodeId === nodeId,
    );

  if (!node) {
    return [];
  }

  return (
    node.definitions || []
  ).map(
    (definition) => ({
      nodeId,

      name:
        definition.name,

      kind:
        definition.kind,

      startIndex:
        definition.startIndex,

      endIndex:
        definition.endIndex,
    }),
  );
};

const createUseNameSet = (
  dataFlow,
  nodeId,
) => {
  return new Set(
    getUsesForNode(
      dataFlow,
      nodeId,
    ).map(
      (use) =>
        use.name,
    ),
  );
};

const createDefinitionNameSet = (
  dataFlow,
  nodeId,
) => {
  return new Set(
    getDefinitionsForNode(
      dataFlow,
      nodeId,
    ).map(
      (definition) =>
        definition.name,
    ),
  );
};

const unionSets = (
  sets,
) => {
  const result =
    new Set();

  for (
    const set of sets
  ) {
    for (
      const value of set
    ) {
      result.add(value);
    }
  }

  return result;
};

const subtractSet = (
  source,
  valuesToRemove,
) => {
  const result =
    new Set(source);

  for (
    const value of
      valuesToRemove
  ) {
    result.delete(value);
  }

  return result;
};

const setsEqual = (
  first,
  second,
) => {
  if (
    first.size !==
    second.size
  ) {
    return false;
  }

  for (
    const value of first
  ) {
    if (
      !second.has(value)
    ) {
      return false;
    }
  }

  return true;
};

const analyzeLiveVariables = ({
  graph,
  dataFlow,
  filePath = null,
  language = null,
  functionName = null,
} = {}) => {
  if (
    !graph ||
    !dataFlow
  ) {
    return {
      filePath,
      language,
      functionName,
      nodes: [],
      converged: true,
      iterations: 0,
    };
  }

  const graphNodes =
    getGraphNodes(graph);

  const useSets =
    new Map();

  const defSets =
    new Map();

  const inSets =
    new Map();

  const outSets =
    new Map();

  for (
    const node of graphNodes
  ) {
    useSets.set(
      node.id,
      createUseNameSet(
        dataFlow,
        node.id,
      ),
    );

    defSets.set(
      node.id,
      createDefinitionNameSet(
        dataFlow,
        node.id,
      ),
    );

    inSets.set(
      node.id,
      new Set(),
    );

    outSets.set(
      node.id,
      new Set(),
    );
  }

  let iterations = 0;
  let changed = true;

  const maxIterations =
    Math.max(
      1,
      graphNodes.length * 10,
    );

  while (
    changed &&
    iterations <
      maxIterations
  ) {
    changed = false;
    iterations += 1;

    for (
      let index =
        graphNodes.length - 1;
      index >= 0;
      index -= 1
    ) {
      const node =
        graphNodes[index];

      const successors =
        getSuccessors(
          graph,
          node,
        );

      const successorInSets =
        successors.map(
          (successor) =>
            inSets.get(
              successor.id,
            ) ||
            new Set(),
        );

      const newOut =
        unionSets(
          successorInSets,
        );

      const uses =
        useSets.get(
          node.id,
        ) ||
        new Set();

      const definitions =
        defSets.get(
          node.id,
        ) ||
        new Set();

      const newIn =
        unionSets([
          uses,
          subtractSet(
            newOut,
            definitions,
          ),
        ]);

      const previousIn =
        inSets.get(
          node.id,
        ) ||
        new Set();

      const previousOut =
        outSets.get(
          node.id,
        ) ||
        new Set();

      if (
        !setsEqual(
          previousIn,
          newIn,
        ) ||
        !setsEqual(
          previousOut,
          newOut,
        )
      ) {
        changed = true;
      }

      inSets.set(
        node.id,
        newIn,
      );

      outSets.set(
        node.id,
        newOut,
      );
    }
  }

  const nodes =
    graphNodes.map(
      (node) => ({
        nodeId: node.id,

        nodeKind:
          node.kind,

        label:
          node.label || null,

        use:
          [
            ...(useSets.get(
              node.id,
            ) || new Set()),
          ],

        def:
          [
            ...(defSets.get(
              node.id,
            ) || new Set()),
          ],

        in:
          [
            ...(inSets.get(
              node.id,
            ) || new Set()),
          ],

        out:
          [
            ...(outSets.get(
              node.id,
            ) || new Set()),
          ],
      }),
    );

  return {
    filePath:
      filePath ??
      dataFlow.filePath ??
      graph.filePath ??
      null,

    language:
      language ??
      dataFlow.language ??
      graph.language ??
      null,

    functionName:
      functionName ??
      dataFlow.functionName ??
      graph.functionName ??
      null,

    nodes,

    converged:
      !changed,

    iterations,
  };
};

export {
  analyzeLiveVariables,
};

export default analyzeLiveVariables;