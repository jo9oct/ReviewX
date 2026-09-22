
export const logicPatterns = Object.freeze({
  assignmentInCondition:
    /^(?:if|while|for)\s*\((.*?)\)/,

  unreachableAfterExit:
    /\b(?:return|throw|break|continue)\s*;?\s*$/,

  emptyBranch:
    /^(?:if|else\s+if|else|catch|finally)\b/,

  contradictoryEquality:
    /\b([A-Za-z_$][\w$]*)\s*===\s*([^\s]+)\s*&&\s*\1\s*!==\s*\2\b/,

  contradictoryRange:
    /\b([A-Za-z_$][\w$]*)\s*>\s*([0-9]+)\s*&&\s*\1\s*<\s*([0-9]+)\b/,

  alwaysFalseComparison:
    /\b([A-Za-z_$][\w$]*)\s*===\s*\1\b/,

  staticFalseLoop:
    /\bwhile\s*\(\s*(false|0)\s*\)/,

  staticTrueLoop:
    /\bwhile\s*\(\s*(true|1)\s*\)/,

  doubleNegation:
    /!!\s*([A-Za-z_$][\w$]*)/
});