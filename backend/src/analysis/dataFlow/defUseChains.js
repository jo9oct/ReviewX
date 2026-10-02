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

const createDefinitionId = ({
  nodeId,
  index,
}) => {
  return `def-${nodeId}-${index + 1}`;
};

const createUseId = ({
  nodeId,
  index,
}) => {
  return `use-${nodeId}-${index + 1}`;
};

const getNodeData = (
  dataFlow,
  nodeId,
) => {
  return (
    dataFlow?.nodes || []
  ).find(
    (node) =>
      node.nodeId === nodeId,
  );
};

const getDefinitionsForNode = (
  dataFlow,
  nodeId,
) => {
  const node =
    getNodeData(
      dataFlow,
      nodeId,
    );

  if (!node) {
    return [];
  }

  return (
    node.definitions || []
  ).map(
    (definition, index) => ({
      id:
        createDefinitionId({
          nodeId,
          index,
        }),

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

const getUsesForNode = (
  dataFlow,
  nodeId,
) => {
  const node =
    getNodeData(
      dataFlow,
      nodeId,
    );

  if (!node) {
    return [];
  }

  return (
    node.uses || []
  ).map(
    (use, index) => ({
      id:
        createUseId({
          nodeId,
          index,
        }),

      nodeId,

      name:
        use.name,

      kind:
        use.kind,

      startIndex:
        use.startIndex,

      endIndex:
        use.endIndex,
    }),
  );
};

const getReachingDefinitionsForNode =
  (
    reachingDefinitions,
    nodeId,
  ) => {
    const node =
      (
        reachingDefinitions
          ?.nodes || []
      ).find(
        (item) =>
          item.nodeId ===
          nodeId,
      );

    return node?.in || [];
  };

const buildUseDefChains = ({
  graph,
  dataFlow,
  reachingDefinitions,
} = {}) => {
  const useDefChains = [];

  const graphNodes =
    getGraphNodes(graph);

  for (
    const node of graphNodes
  ) {
    const uses =
      getUsesForNode(
        dataFlow,
        node.id,
      );

    if (!uses.length) {
      continue;
    }

    const reaching =
      getReachingDefinitionsForNode(
        reachingDefinitions,
        node.id,
      );

    for (
      const use of uses
    ) {
      const matchingDefinitions =
        reaching.filter(
          (definition) =>
            definition.name ===
            use.name,
        );

      useDefChains.push({
        useId:
          use.id,

        useNodeId:
          use.nodeId,

        variable:
          use.name,

        definitions:
          matchingDefinitions.map(
            (definition) =>
              definition.id,
          ),
      });
    }
  }

  return useDefChains;
};

const buildDefUseChains = ({
  graph,
  dataFlow,
  reachingDefinitions,
} = {}) => {
  const defUseMap =
    new Map();

  const graphNodes =
    getGraphNodes(graph);

  for (
    const node of graphNodes
  ) {
    const definitions =
      getDefinitionsForNode(
        dataFlow,
        node.id,
      );

    for (
      const definition of
        definitions
    ) {
      defUseMap.set(
        definition.id,
        {
          definitionId:
            definition.id,

          definitionNodeId:
            definition.nodeId,

          variable:
            definition.name,

          uses: [],
        },
      );
    }
  }

  const useDefChains =
    buildUseDefChains({
      graph,
      dataFlow,
      reachingDefinitions,
    });

  for (
    const chain of
      useDefChains
  ) {
    for (
      const definitionId of
        chain.definitions
    ) {
      const definition =
        defUseMap.get(
          definitionId,
        );

      if (!definition) {
        continue;
      }

      definition.uses.push(
        chain.useId,
      );
    }
  }

  return [
    ...defUseMap.values(),
  ];
};

const analyzeDefUseChains = ({
  graph,
  dataFlow,
  reachingDefinitions,
  filePath = null,
  language = null,
  functionName = null,
} = {}) => {
  const useDefChains =
    buildUseDefChains({
      graph,
      dataFlow,
      reachingDefinitions,
    });

  const defUseChains =
    buildDefUseChains({
      graph,
      dataFlow,
      reachingDefinitions,
    });

  return {
    filePath:
      filePath ??
      dataFlow?.filePath ??
      graph?.filePath ??
      null,

    language:
      language ??
      dataFlow?.language ??
      graph?.language ??
      null,

    functionName:
      functionName ??
      dataFlow?.functionName ??
      graph?.functionName ??
      null,

    useDefChains,

    defUseChains,

    useCount:
      useDefChains.length,

    definitionCount:
      defUseChains.length,
  };
};

export {
  buildUseDefChains,
  buildDefUseChains,
  analyzeDefUseChains,
};

export default analyzeDefUseChains;