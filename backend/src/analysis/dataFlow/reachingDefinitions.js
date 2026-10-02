const getGraphNodes = (graph) => {
  if (
    !graph ||
    typeof graph.getNodes !== 'function'
  ) {
    return [];
  }

  const nodes = graph.getNodes();

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

const getPredecessors = (
  graph,
  node,
) => {
  if (
    graph &&
    typeof graph.getPredecessors ===
      'function'
  ) {
    const predecessors =
      graph.getPredecessors(node);

    return Array.isArray(predecessors)
      ? predecessors
      : [];
  }

  if (
    Array.isArray(node?.incoming)
  ) {
    return node.incoming
      .map(
        (edge) => edge?.source,
      )
      .filter(Boolean);
  }

  return [];
};

const createDefinitionId = ({
  nodeId,
  index,
}) => {
  return `def-${nodeId}-${index + 1}`;
};

const normalizeDefinitions = (
  analysis,
) => {
  const definitions = [];

  for (const node of analysis?.nodes || []) {
    for (
      let index = 0;
      index <
        (node.definitions || []).length;
      index += 1
    ) {
      const definition =
        node.definitions[index];

      definitions.push({
        id: createDefinitionId({
          nodeId: node.nodeId,
          index,
        }),

        nodeId: node.nodeId,

        name: definition.name,

        kind: definition.kind,

        startIndex:
          definition.startIndex,

        endIndex:
          definition.endIndex,
      });
    }
  }

  return definitions;
};

const createDefinitionKey = (
  definition,
) => {
  return definition.id;
};

const getDefinitionsForNode = (
  analysis,
  nodeId,
) => {
  const node =
    (analysis?.nodes || []).find(
      (item) =>
        item.nodeId === nodeId,
    );

  if (!node) {
    return [];
  }

  return (node.definitions || [])
    .map(
      (definition, index) => ({
        id: createDefinitionId({
          nodeId,
          index,
        }),

        nodeId,

        name: definition.name,

        kind: definition.kind,

        startIndex:
          definition.startIndex,

        endIndex:
          definition.endIndex,
      }),
    );
};

const buildDefinitionIndex = (
  definitions,
) => {
  const byName = new Map();

  for (const definition of definitions) {
    if (!byName.has(definition.name)) {
      byName.set(
        definition.name,
        [],
      );
    }

    byName
      .get(definition.name)
      .push(definition);
  }

  return byName;
};

const createGenSets = (
  analysis,
) => {
  const gen = new Map();

  for (const node of analysis?.nodes || []) {
    gen.set(
      node.nodeId,
      new Set(
        getDefinitionsForNode(
          analysis,
          node.nodeId,
        ).map(
          (definition) =>
            createDefinitionKey(
              definition,
            ),
        ),
      ),
    );
  }

  return gen;
};

const createKillSets = (
  analysis,
  definitions,
) => {
  const byName =
    buildDefinitionIndex(
      definitions,
    );

  const kill = new Map();

  for (const node of analysis?.nodes || []) {
    const nodeDefinitions =
      getDefinitionsForNode(
        analysis,
        node.nodeId,
      );

    const names =
      new Set(
        nodeDefinitions.map(
          (definition) =>
            definition.name,
        ),
      );

    const killed = new Set();

    for (const name of names) {
      for (
        const definition of
          byName.get(name) || []
      ) {
        if (
          !nodeDefinitions.some(
            (current) =>
              current.id ===
              definition.id,
          )
        ) {
          killed.add(
            createDefinitionKey(
              definition,
            ),
          );
        }
      }
    }

    kill.set(
      node.nodeId,
      killed,
    );
  }

  return kill;
};

const unionSets = (
  sets,
) => {
  const result = new Set();

  for (const set of sets) {
    for (const value of set) {
      result.add(value);
    }
  }

  return result;
};

const subtractSet = (
  source,
  valuesToRemove,
) => {
  const result = new Set(source);

  for (const value of valuesToRemove) {
    result.delete(value);
  }

  return result;
};

const setsEqual = (
  first,
  second,
) => {
  if (first.size !== second.size) {
    return false;
  }

  for (const value of first) {
    if (!second.has(value)) {
      return false;
    }
  }

  return true;
};

const getDefinitionMap = (
  definitions,
) => {
  return new Map(
    definitions.map(
      (definition) => [
        definition.id,
        definition,
      ],
    ),
  );
};

const resolveDefinitionSet = ({
  set,
  definitionMap,
}) => {
  return [
    ...set,
  ]
    .map(
      (id) =>
        definitionMap.get(id),
    )
    .filter(Boolean);
};

const analyzeReachingDefinitions = ({
  graph,
  dataFlow,
  filePath = null,
  language = null,
  functionName = null,
} = {}) => {
  if (!graph || !dataFlow) {
    return {
      filePath,
      language,
      functionName,
      definitionCount: 0,
      nodes: [],
      converged: true,
      iterations: 0,
    };
  }

  const graphNodes =
    getGraphNodes(graph);

  const definitions =
    normalizeDefinitions(
      dataFlow,
    );

  const definitionMap =
    getDefinitionMap(
      definitions,
    );

  const gen =
    createGenSets(
      dataFlow,
    );

  const kill =
    createKillSets(
      dataFlow,
      definitions,
    );

  const inSets = new Map();
  const outSets = new Map();

  for (const node of graphNodes) {
    inSets.set(
      node.id,
      new Set(),
    );

    outSets.set(
      node.id,
      new Set(
        gen.get(node.id) || [],
      ),
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

    for (const node of graphNodes) {
      const predecessors =
        getPredecessors(
          graph,
          node,
        );

      const predecessorOutSets =
        predecessors.map(
          (predecessor) =>
            outSets.get(
              predecessor.id,
            ) || new Set(),
        );

      const newIn =
        unionSets(
          predecessorOutSets,
        );

      const newOut =
        unionSets([
          gen.get(node.id) ||
            new Set(),

          subtractSet(
            newIn,
            kill.get(node.id) ||
              new Set(),
          ),
        ]);

      const previousIn =
        inSets.get(node.id) ||
        new Set();

      const previousOut =
        outSets.get(node.id) ||
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
        nodeKind: node.kind,
        label: node.label || null,

        gen:
          resolveDefinitionSet({
            set:
              gen.get(node.id) ||
              new Set(),
            definitionMap,
          }),

        kill:
          resolveDefinitionSet({
            set:
              kill.get(node.id) ||
              new Set(),
            definitionMap,
          }),

        in:
          resolveDefinitionSet({
            set:
              inSets.get(node.id) ||
              new Set(),
            definitionMap,
          }),

        out:
          resolveDefinitionSet({
            set:
              outSets.get(node.id) ||
              new Set(),
            definitionMap,
          }),
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

    definitionCount:
      definitions.length,

    definitions,

    nodes,

    converged:
      !changed,

    iterations,
  };
};

export {
  analyzeReachingDefinitions,
};

export default analyzeReachingDefinitions;