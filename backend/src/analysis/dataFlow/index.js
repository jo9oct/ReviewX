export {
  ASSIGNMENT_OPERATORS,
  isAssignmentOperator,
  getNodeDefinitions,
} from './definitions.js';

export {
  getNodeUses,
} from './uses.js';

export {
  analyzeDataFlow,
  getDefinitions,
  getUses,
} from './dataFlowAnalysis.js';

export {
  analyzeReachingDefinitions,
} from './reachingDefinitions.js';

export {
  analyzeLiveVariables,
} from './liveVariables.js';

export {
  buildUseDefChains,
  buildDefUseChains,
  analyzeDefUseChains,
} from './defUseChains.js';

export {
  findUnusedDefinitions,
  findUnresolvedUses,
  buildDefinitionUseTrace,
  analyzeDataFlowFindings,
} from './dataFlowFindings.js';