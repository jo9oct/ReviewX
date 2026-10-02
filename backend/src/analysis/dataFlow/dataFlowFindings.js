import {
  analyzeDataFlow,
} from './dataFlowAnalysis.js';

import {
  analyzeReachingDefinitions,
} from './reachingDefinitions.js';

import {
  analyzeDefUseChains,
} from './defUseChains.js';

const getFindingLocation = (
  item,
) => {
  if (!item) {
    return null;
  }

  return {
    start:
      item.start ?? null,

    end:
      item.end ?? null,

    startIndex:
      item.startIndex ?? null,

    endIndex:
      item.endIndex ?? null,
  };
};

const createFinding = ({
  type,
  severity,
  message,
  variable,
  location = null,
  metadata = {},
}) => {
  return {
    type,
    severity,
    message,
    variable:
      variable ?? null,
    location,
    metadata,
  };
};

const findUnusedDefinitions = ({
  dataFlow,
  defUseChains,
}) => {
  const findings = [];

  const chains =
    defUseChains?.defUseChains || [];

  const usedDefinitions =
    new Set();

  for (const chain of chains) {
    for (const useId of chain.uses || []) {
      if (!useId) {
        continue;
      }

      usedDefinitions.add(
        chain.definitionId,
      );
    }
  }

  for (const node of dataFlow?.nodes || []) {
    for (
      let index = 0;
      index <
        (node.definitions || []).length;
      index += 1
    ) {
      const definition =
        node.definitions[index];

      const definitionId =
        `def-${node.nodeId}-${index + 1}`;

      if (
        usedDefinitions.has(
          definitionId,
        )
      ) {
        continue;
      }

      findings.push(
        createFinding({
          type:
            'UNUSED_DEFINITION',

          severity:
            'low',

          variable:
            definition.name,

          message:
            `Definition of "${definition.name}" is never used.`,

          location:
            getFindingLocation(
              definition,
            ),

          metadata: {
            definitionId,

            nodeId:
              node.nodeId,

            nodeKind:
              node.nodeKind,
          },
        }),
      );
    }
  }

  return findings;
};

const findUnresolvedUses = ({
  dataFlow,
  reachingDefinitions,
}) => {
  const findings = [];

  const reachingByNode =
    new Map();

  for (
    const node of
      reachingDefinitions?.nodes || []
  ) {
    reachingByNode.set(
      node.nodeId,
      node,
    );
  }

  /*
   * A variable that has a local definition
   * somewhere in the function is considered
   * a locally defined variable.
   *
   * Variables without a local definition may
   * be parameters, globals, imports, or other
   * external inputs. They are not automatically
   * unresolved data-flow uses.
   */
  const locallyDefinedVariables =
    new Set();

  for (
    const node of
      dataFlow?.nodes || []
  ) {
    for (
      const definition of
        node.definitions || []
    ) {
      if (
        definition.name
      ) {
        locallyDefinedVariables.add(
          definition.name,
        );
      }
    }
  }

  for (
    const node of
      dataFlow?.nodes || []
  ) {
    const reachingNode =
      reachingByNode.get(
        node.nodeId,
      );

    const reachingDefinitionsForNode =
      reachingNode?.in || [];

    for (
      const use of
        node.uses || []
    ) {
      /*
       * No local definition means this may be
       * a parameter, global, import, or another
       * external value.
       */
      if (
        !locallyDefinedVariables.has(
          use.name,
        )
      ) {
        continue;
      }

      const matchingDefinitions =
        reachingDefinitionsForNode.filter(
          (definition) =>
            definition.name ===
            use.name,
        );

      if (
        matchingDefinitions.length > 0
      ) {
        continue;
      }

      findings.push(
        createFinding({
          type:
            'UNRESOLVED_USE',

          severity:
            'medium',

          variable:
            use.name,

          message:
            `Use of "${use.name}" has no reaching definition.`,

          location:
            getFindingLocation(
              use,
            ),

          metadata: {
            nodeId:
              node.nodeId,

            nodeKind:
              node.nodeKind,
          },
        }),
      );
    }
  }

  return findings;
};

const buildDefinitionUseTrace = ({
  defUseChains,
}) => {
  return (
    defUseChains?.defUseChains || []
  ).map(
    (chain) => ({
      definitionId:
        chain.definitionId,

      definitionNodeId:
        chain.definitionNodeId,

      variable:
        chain.variable,

      uses: [
        ...(chain.uses || []),
      ],
    }),
  );
};

const analyzeDataFlowFindings = ({
  graph,
  filePath = null,
  language = null,
  functionName = null,
}) => {
  const dataFlow =
    analyzeDataFlow({
      graph,
      filePath,
      language,
      functionName,
    });

  const reachingDefinitions =
    analyzeReachingDefinitions({
      graph,
      dataFlow,
    });

  /*
   * IMPORTANT:
   * defUseChains requires the CFG graph.
   */
  const defUseChains =
    analyzeDefUseChains({
      graph,
      dataFlow,
      reachingDefinitions,
      filePath,
      language,
      functionName,
    });

  const unusedDefinitions =
    findUnusedDefinitions({
      dataFlow,
      defUseChains,
    });

  const unresolvedUses =
    findUnresolvedUses({
      dataFlow,
      reachingDefinitions,
    });

  const definitionUseTrace =
    buildDefinitionUseTrace({
      defUseChains,
    });

  return {
    filePath,
    language,
    functionName,

    findings: [
      ...unusedDefinitions,
      ...unresolvedUses,
    ],

    unusedDefinitions,

    unresolvedUses,

    definitionUseTrace,

    counts: {
      total:
        unusedDefinitions.length +
        unresolvedUses.length,

      unusedDefinitions:
        unusedDefinitions.length,

      unresolvedUses:
        unresolvedUses.length,

      definitionUseTraces:
        definitionUseTrace.length,
    },
  };
};

export {
  findUnusedDefinitions,
  findUnresolvedUses,
  buildDefinitionUseTrace,
  analyzeDataFlowFindings,
};

export default analyzeDataFlowFindings;