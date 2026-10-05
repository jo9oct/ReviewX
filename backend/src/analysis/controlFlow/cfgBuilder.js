import {
  CFG_NODE_KINDS,
  CFG_EDGE_KINDS,
  CFGNode,
  ControlFlowGraph,
} from './cfgNode.js';

const getChildren = (node) => {
  return Array.isArray(node?.children)
    ? node.children
    : [];
};

const getNodeLocation = (node) => {
  if (!node) {
    return null;
  }

  return {
    start: node.start || null,
    end: node.end || null,
    startIndex: Number.isInteger(node.startIndex)
      ? node.startIndex
      : null,
    endIndex: Number.isInteger(node.endIndex)
      ? node.endIndex
      : null,
  };
};

const getNodeText = (node) => {
  return typeof node?.text === 'string'
    ? node.text
    : null;
};

const getNodeMetadata = (node) => {
  return {
    astType: node?.type || null,
    location: getNodeLocation(node),
  };
};

const isProgramNode = (node) => {
  return node?.type === 'program';
};

const isFunctionNode = (node) => {
  return [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
  ].includes(node?.type);
};

const isBlockNode = (node) => {
  return [
    'statement_block',
    'block',
  ].includes(node?.type);
};

const isIfNode = (node) => {
  return [
    'if_statement',
    'if_expression',
  ].includes(node?.type);
};

const isSwitchNode = (node) => {
  return [
    'switch_statement',
    'switch_expression',
  ].includes(node?.type);
};

const isLoopNode = (node) => {
  return [
    'for_statement',
    'for_in_statement',
    'for_of_statement',
    'while_statement',
    'do_statement',
  ].includes(node?.type);
};

const isTryNode = (node) => {
  return node?.type === 'try_statement';
};

const isReturnNode = (node) => {
  return node?.type === 'return_statement';
};

const isBreakNode = (node) => {
  return node?.type === 'break_statement';
};

const isContinueNode = (node) => {
  return node?.type === 'continue_statement';
};

const isThrowNode = (node) => {
  return node?.type === 'throw_statement';
};

const createNode = ({
  graph,
  kind,
  astNode,
  label = null,
  metadata = {},
}) => {
  return graph.createNode({
    kind,
    astNode: getNodeLocation(astNode),
    label:
      label ??
      getNodeText(astNode),
    metadata: {
      ...getNodeMetadata(astNode),
      ...metadata,
      sourceNode: astNode || null,
    },
  });
};

const createEntryExit = (graph) => {
  const entry = createNode({
    graph,
    kind: CFG_NODE_KINDS.ENTRY,
    label: 'ENTRY',
    metadata: {
      synthetic: true,
    },
  });

  const exit = createNode({
    graph,
    kind: CFG_NODE_KINDS.EXIT,
    label: 'EXIT',
    metadata: {
      synthetic: true,
    },
  });

  graph.setEntry(entry);
  graph.setExit(exit);

  return {
    entry,
    exit,
  };
};

const connect = ({
  graph,
  source,
  target,
  kind = CFG_EDGE_KINDS.NORMAL,
  label = null,
  metadata = {},
}) => {
  if (
    !(source instanceof CFGNode) ||
    !(target instanceof CFGNode)
  ) {
    return null;
  }

  return graph.createEdge({
    source,
    target,
    kind,
    label,
    metadata,
  });
};

const getStatementChildren = (node) => {
  return getChildren(node).filter(
    (child) => {
      if (!child) {
        return false;
      }

      return child.type !== 'comment';
    },
  );
};

/*
 * Recursively determine whether an AST node contains
 * an operation that may produce an implicit exception.
 *
 * This is intentionally conservative. The CFG does not
 * execute code, so calls, awaits, object construction,
 * member access, and indexing are treated as potentially
 * throwing operations.
 */
const containsPotentialThrow = (node) => {
  if (!node) {
    return false;
  }

  const potentiallyThrowingTypes = [
    'call_expression',
    'await_expression',
    'new_expression',
    'member_expression',
    'subscript_expression',
    'optional_call_expression',
    'optional_member_expression',
  ];

  if (
    potentiallyThrowingTypes.includes(node.type)
  ) {
    return true;
  }

  return getChildren(node).some(
    (child) =>
      containsPotentialThrow(child),
  );
};

const addImplicitExceptionEdge = ({
  graph,
  source,
  context,
  astNode,
}) => {
  const exceptionTarget =
    context.exceptionTargets.at(-1);

  if (!exceptionTarget) {
    return;
  }

  if (!containsPotentialThrow(astNode)) {
    return;
  }

  connect({
    graph,
    source,
    target: exceptionTarget,
    kind: CFG_EDGE_KINDS.EXCEPTION,
    metadata: {
      handled: true,
      implicit: true,
      reason: 'potential_exception',
    },
  });
};

const findIfParts = (node) => {
  const children = getChildren(node);

  let condition = null;
  let consequence = null;
  let alternative = null;

  for (const child of children) {
    if (
      !condition &&
      [
        'parenthesized_expression',
        'binary_expression',
        'unary_expression',
        'call_expression',
        'member_expression',
        'identifier',
        'await_expression',
        'ternary_expression',
        'assignment_expression',
      ].includes(child.type)
    ) {
      condition = child;
      continue;
    }

    if (
      !consequence &&
      [
        'statement_block',
        'expression_statement',
        'return_statement',
        'if_statement',
        'for_statement',
        'for_in_statement',
        'for_of_statement',
        'while_statement',
        'do_statement',
        'try_statement',
      ].includes(child.type)
    ) {
      consequence = child;
      continue;
    }

    if (
      !alternative &&
      child.type === 'else_clause'
    ) {
      alternative = child;
    }
  }

  if (!condition && children.length > 0) {
    condition = children[0];
  }

  if (!consequence && children.length > 1) {
    consequence = children[1];
  }

  return {
    condition,
    consequence,
    alternative,
  };
};

const getElseBody = (elseNode) => {
  if (!elseNode) {
    return null;
  }

  return getChildren(elseNode).find(
    (child) => child.type !== 'else',
  ) || null;
};

const getLoopBody = (node) => {
  const children = getChildren(node);

  const bodyCandidates = children.filter(
    (child) =>
      [
        'statement_block',
        'block',
        'expression_statement',
        'if_statement',
        'for_statement',
        'for_in_statement',
        'for_of_statement',
        'while_statement',
        'do_statement',
        'return_statement',
        'break_statement',
        'continue_statement',
        'throw_statement',
        'try_statement',
      ].includes(child.type),
  );

  return bodyCandidates.at(-1) || null;
};

const getLoopCondition = (node) => {
  const children = getChildren(node);

  if (
    node.type === 'while_statement' ||
    node.type === 'do_statement'
  ) {
    return children.find(
      (child) =>
        [
          'parenthesized_expression',
          'binary_expression',
          'identifier',
          'call_expression',
          'member_expression',
          'unary_expression',
        ].includes(child.type),
    ) || null;
  }

  if (
    node.type === 'for_statement' ||
    node.type === 'for_in_statement' ||
    node.type === 'for_of_statement'
  ) {
    return children.find(
      (child) =>
        [
          'binary_expression',
          'identifier',
          'call_expression',
          'member_expression',
          'parenthesized_expression',
          'unary_expression',
          'assignment_expression',
        ].includes(child.type),
    ) || null;
  }

  return null;
};

const getSwitchBody = (node) => {
  return getChildren(node).find(
    (child) =>
      child.type === 'switch_body',
  ) || null;
};

const getSwitchCondition = (node) => {
  return getChildren(node).find(
    (child) =>
      child.type === 'parenthesized_expression' ||
      child.type === 'identifier' ||
      child.type === 'binary_expression' ||
      child.type === 'call_expression' ||
      child.type === 'member_expression',
  ) || null;
};

const getSwitchCases = (node) => {
  const switchBody =
    node?.type === 'switch_body'
      ? node
      : getSwitchBody(node);

  if (!switchBody) {
    return [];
  }

  return getChildren(switchBody).filter(
    (child) =>
      [
        'switch_case',
        'case_clause',
        'switch_default',
        'default_clause',
      ].includes(child.type),
  );
};

const isDefaultCase = (caseNode) => {
  return [
    'switch_default',
    'default_clause',
  ].includes(caseNode?.type);
};

const getCaseBody = (caseNode) => {
  const children = getChildren(caseNode);

  if (
    caseNode?.type === 'switch_case'
  ) {
    return children.slice(1);
  }

  return children.filter(
    (child) =>
      ![
        'case',
        'default',
        'colon',
      ].includes(child.type),
  );
};

const getTryBody = (node) => {
  return getChildren(node).find(
    (child) =>
      isBlockNode(child),
  ) || null;
};

const getCatchClause = (node) => {
  return getChildren(node).find(
    (child) =>
      child.type === 'catch_clause',
  ) || null;
};

const getFinallyClause = (node) => {
  return getChildren(node).find(
    (child) =>
      child.type === 'finally_clause',
  ) || null;
};

const getCatchParameter = (catchNode) => {
  if (!catchNode) {
    return null;
  }

  return getChildren(catchNode).find(
    (child) =>
      child.type !== 'statement_block',
  ) || null;
};

const getCatchBody = (catchNode) => {
  if (!catchNode) {
    return null;
  }

  return getChildren(catchNode).find(
    (child) =>
      isBlockNode(child),
  ) || null;
};

const getFinallyBody = (finallyNode) => {
  if (!finallyNode) {
    return null;
  }

  return getChildren(finallyNode).find(
    (child) =>
      isBlockNode(child),
  ) || null;
};

const getThrowExpression = (node) => {
  return getChildren(node)[0] || null;
};

const getFunctionName = (node) => {
  const identifier =
    getChildren(node).find(
      (child) => child.type === 'identifier',
    );

  return identifier?.text || null;
};

const buildCfg = ({
  ast,
  filePath = null,
  language = null,
  functionName = null,
} = {}) => {
  if (!ast) {
    return null;
  }

  const graph =
    new ControlFlowGraph({
      filePath,
      language,
      functionName,
    });

  const {
    entry,
    exit,
  } = createEntryExit(graph);

  const context = {
    graph,
    exit,
    breakTargets: [],
    continueTargets: [],
    exceptionTargets: [],
    finallyTargets: [],
  };

  const rootNodes =
    isProgramNode(ast)
      ? getStatementChildren(ast)
      : [ast];

  const result =
    buildSequence({
      nodes: rootNodes,
      context,
      start: entry,
    });

  if (result.fallthrough && result.node) {
    connect({
      graph,
      source: result.node,
      target: exit,
    });
  }

  return graph;
};

const buildSequence = ({
  nodes,
  context,
  start,
  incomingEdgeKind = CFG_EDGE_KINDS.NORMAL,
}) => {
  let current = start;
  let fallthrough = true;
  let first = true;

  for (const node of nodes || []) {
    if (!node) {
      continue;
    }

    const result =
      buildNode({
        node,
        context,
        start: fallthrough ? current : null,
        incomingEdgeKind:
          first && fallthrough
            ? incomingEdgeKind
            : CFG_EDGE_KINDS.NORMAL,
      });

    if (!result) {
      continue;
    }

    current = result.node;

    if (!result.fallthrough) {
      fallthrough = false;
    }

    first = false;
  }

  return {
    node: current,
    fallthrough,
  };
};

const buildNode = ({
  node,
  context,
  start,
  incomingEdgeKind = CFG_EDGE_KINDS.NORMAL,
}) => {
  if (!node) {
    return {
      node: start,
      fallthrough: true,
    };
  }

  if (isProgramNode(node)) {
    return buildSequence({
      nodes: getStatementChildren(node),
      context,
      start,
      incomingEdgeKind,
    });
  }

  if (isBlockNode(node)) {
    return buildBlock({
      node,
      context,
      start,
      incomingEdgeKind,
    });
  }

  if (isIfNode(node)) {
    return buildIf({
      node,
      context,
      start,
      incomingEdgeKind,
    });
  }

  if (isSwitchNode(node)) {
    return buildSwitch({
      node,
      context,
      start,
      incomingEdgeKind,
    });
  }

  if (isLoopNode(node)) {
    return buildLoop({
      node,
      context,
      start,
      incomingEdgeKind,
    });
  }

  if (isTryNode(node)) {
    return buildTry({
      node,
      context,
      start,
      incomingEdgeKind,
    });
  }

  if (isReturnNode(node)) {
    return buildTerminalStatement({
      node,
      context,
      start,
      kind: CFG_NODE_KINDS.RETURN,
      edgeKind: CFG_EDGE_KINDS.RETURN,
      target: context.exit,
      incomingEdgeKind,
    });
  }

  if (isBreakNode(node)) {
    const target =
      context.breakTargets.at(-1);

    return buildTerminalStatement({
      node,
      context,
      start,
      kind: CFG_NODE_KINDS.BREAK,
      edgeKind: CFG_EDGE_KINDS.BREAK,
      target: target || context.exit,
      incomingEdgeKind,
    });
  }

  if (isContinueNode(node)) {
    const target =
      context.continueTargets.at(-1);

    return buildTerminalStatement({
      node,
      context,
      start,
      kind: CFG_NODE_KINDS.CONTINUE,
      edgeKind: CFG_EDGE_KINDS.CONTINUE,
      target: target || context.exit,
      incomingEdgeKind,
    });
  }

  if (isThrowNode(node)) {
    return buildThrow({
      node,
      context,
      start,
      incomingEdgeKind,
    });
  }

  if (isFunctionNode(node)) {
    return buildFunctionBody({
      node,
      context,
      start,
      incomingEdgeKind,
    });
  }

  return buildSimpleStatement({
    node,
    context,
    start,
    incomingEdgeKind,
  });
};

const buildSimpleStatement = ({
  node,
  context,
  start,
  incomingEdgeKind,
}) => {
  const cfgNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.STATEMENT,
      astNode: node,
    });

  connect({
    graph: context.graph,
    source: start,
    target: cfgNode,
    kind: incomingEdgeKind,
  });

  addImplicitExceptionEdge({
    graph: context.graph,
    source: cfgNode,
    context,
    astNode: node,
  });

  return {
    node: cfgNode,
    fallthrough: true,
  };
};

const buildTerminalStatement = ({
  node,
  context,
  start,
  kind,
  edgeKind,
  target,
  incomingEdgeKind,
}) => {
  const cfgNode =
    createNode({
      graph: context.graph,
      kind,
      astNode: node,
      metadata: {
        terminal: true,
        terminalEdgeKind: edgeKind,
      },
    });

  connect({
    graph: context.graph,
    source: start,
    target: cfgNode,
    kind: incomingEdgeKind,
  });

  const finallyTarget =
    context.finallyTargets.at(-1);

  if (finallyTarget) {
    connect({
      graph: context.graph,
      source: cfgNode,
      target: finallyTarget.entry,
      kind: CFG_EDGE_KINDS.NORMAL,
      metadata: {
        abrupt: true,
        completion: edgeKind,
      },
    });

    finallyTarget.completions.push({
      source: cfgNode,
      target,
      edgeKind,
    });
  } else if (target) {
    connect({
      graph: context.graph,
      source: cfgNode,
      target,
      kind: edgeKind,
    });
  }

  return {
    node: cfgNode,
    fallthrough: false,
  };
};

const buildThrow = ({
  node,
  context,
  start,
  incomingEdgeKind,
}) => {
  const cfgNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.THROW,
      astNode: node,
      metadata: {
        controlType: 'throw',
        expressionType:
          getThrowExpression(node)?.type || null,
      },
    });

  connect({
    graph: context.graph,
    source: start,
    target: cfgNode,
    kind: incomingEdgeKind,
  });

  const finallyTarget =
    context.finallyTargets.at(-1);

  if (finallyTarget) {
    connect({
      graph: context.graph,
      source: cfgNode,
      target: finallyTarget.entry,
      kind: CFG_EDGE_KINDS.THROW,
      metadata: {
        handled: false,
        deferred: true,
      },
    });

    finallyTarget.completions.push({
      source: cfgNode,
      target:
        context.exceptionTargets.at(-1) ||
        context.exit,
      edgeKind: CFG_EDGE_KINDS.THROW,
    });
  } else {
    const exceptionTarget =
      context.exceptionTargets.at(-1);

    connect({
      graph: context.graph,
      source: cfgNode,
      target:
        exceptionTarget || context.exit,
      kind: CFG_EDGE_KINDS.THROW,
      metadata: {
        handled:
          Boolean(exceptionTarget),
      },
    });
  }

  return {
    node: cfgNode,
    fallthrough: false,
  };
};

const buildBlock = ({
  node,
  context,
  start,
  incomingEdgeKind,
}) => {
  const children =
    getStatementChildren(node);

  if (children.length === 0) {
    return {
      node: start,
      fallthrough: true,
    };
  }

  return buildSequence({
    nodes: children,
    context,
    start,
    incomingEdgeKind,
  });
};

const buildIf = ({
  node,
  context,
  start,
  incomingEdgeKind,
}) => {
  const {
    condition,
    consequence,
    alternative,
  } = findIfParts(node);

  const conditionNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.CONDITION,
      astNode: condition || node,
      metadata: {
        controlType: 'if',
      },
    });

  connect({
    graph: context.graph,
    source: start,
    target: conditionNode,
    kind: incomingEdgeKind,
  });

  addImplicitExceptionEdge({
    graph: context.graph,
    source: conditionNode,
    context,
    astNode: condition,
  });

  const joinNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.JOIN,
      astNode: null,
      label: 'IF_JOIN',
      metadata: {
        synthetic: true,
        controlType: 'if',
      },
    });

  const consequenceResult =
    consequence
      ? buildNode({
          node: consequence,
          context,
          start: conditionNode,
          incomingEdgeKind:
            CFG_EDGE_KINDS.TRUE,
        })
      : {
          node: conditionNode,
          fallthrough: true,
        };

  if (consequenceResult.fallthrough) {
    connect({
      graph: context.graph,
      source: consequenceResult.node,
      target: joinNode,
    });
  }

  if (alternative) {
    const alternativeBody =
      getElseBody(alternative);

    const alternativeResult =
      alternativeBody
        ? buildNode({
            node: alternativeBody,
            context,
            start: conditionNode,
            incomingEdgeKind:
              CFG_EDGE_KINDS.FALSE,
          })
        : {
            node: conditionNode,
            fallthrough: true,
          };

    if (alternativeResult.fallthrough) {
      connect({
        graph: context.graph,
        source: alternativeResult.node,
        target: joinNode,
      });
    }
  } else {
    connect({
      graph: context.graph,
      source: conditionNode,
      target: joinNode,
      kind: CFG_EDGE_KINDS.FALSE,
    });
  }

  return {
    node: joinNode,
    fallthrough: true,
  };
};

const buildLoop = ({
  node,
  context,
  start,
  incomingEdgeKind,
}) => {
  const condition =
    getLoopCondition(node);

  const conditionNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.LOOP,
      astNode: condition || node,
      metadata: {
        controlType: node.type,
      },
    });

  connect({
    graph: context.graph,
    source: start,
    target: conditionNode,
    kind: incomingEdgeKind,
  });

  addImplicitExceptionEdge({
    graph: context.graph,
    source: conditionNode,
    context,
    astNode: condition,
  });

  const afterLoop =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.JOIN,
      astNode: null,
      label: 'LOOP_EXIT',
      metadata: {
        synthetic: true,
        controlType: node.type,
      },
    });

  const loopContext = {
    ...context,
    breakTargets: [
      ...context.breakTargets,
      afterLoop,
    ],
    continueTargets: [
      ...context.continueTargets,
      conditionNode,
    ],
  };

  const body =
    getLoopBody(node);

  const bodyResult =
    body
      ? buildNode({
          node: body,
          context: loopContext,
          start: conditionNode,
          incomingEdgeKind:
            CFG_EDGE_KINDS.TRUE,
        })
      : {
          node: conditionNode,
          fallthrough: true,
        };

  if (bodyResult.fallthrough) {
    connect({
      graph: context.graph,
      source: bodyResult.node,
      target: conditionNode,
      kind: CFG_EDGE_KINDS.LOOP,
    });
  }

  connect({
    graph: context.graph,
    source: conditionNode,
    target: afterLoop,
    kind: CFG_EDGE_KINDS.FALSE,
  });

  return {
    node: afterLoop,
    fallthrough: true,
  };
};

const buildSwitch = ({
  node,
  context,
  start,
  incomingEdgeKind,
}) => {
  const switchCondition =
    getSwitchCondition(node);

  const switchNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.SWITCH,
      astNode: switchCondition || node,
      metadata: {
        controlType: 'switch',
      },
    });

  connect({
    graph: context.graph,
    source: start,
    target: switchNode,
    kind: incomingEdgeKind,
  });

  addImplicitExceptionEdge({
    graph: context.graph,
    source: switchNode,
    context,
    astNode: switchCondition,
  });

  const joinNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.JOIN,
      astNode: null,
      label: 'SWITCH_EXIT',
      metadata: {
        synthetic: true,
        controlType: 'switch',
      },
    });

  const cases =
    getSwitchCases(node);

  if (cases.length === 0) {
    connect({
      graph: context.graph,
      source: switchNode,
      target: joinNode,
      kind: CFG_EDGE_KINDS.DEFAULT,
    });

    return {
      node: joinNode,
      fallthrough: true,
    };
  }

  const switchContext = {
    ...context,
    breakTargets: [
      ...context.breakTargets,
      joinNode,
    ],
  };

  const hasExplicitDefault =
    cases.some(
      (caseNode) =>
        isDefaultCase(caseNode),
    );

  let previousCaseExit = null;

  for (
    let index = 0;
    index < cases.length;
    index += 1
  ) {
    const caseNode = cases[index];

    const defaultCase =
      isDefaultCase(caseNode);

    const caseEntry =
      createNode({
        graph: context.graph,
        kind: CFG_NODE_KINDS.CONDITION,
        astNode: caseNode,
        metadata: {
          controlType: 'switch_case',
          caseIndex: index,
          defaultCase,
        },
      });

    connect({
      graph: context.graph,
      source: switchNode,
      target: caseEntry,
      kind:
        defaultCase
          ? CFG_EDGE_KINDS.DEFAULT
          : CFG_EDGE_KINDS.CASE,
    });

    if (previousCaseExit) {
      connect({
        graph: context.graph,
        source: previousCaseExit,
        target: caseEntry,
        kind: CFG_EDGE_KINDS.NORMAL,
        metadata: {
          fallthrough: true,
        },
      });

      previousCaseExit = null;
    }

    const caseBody =
      getCaseBody(caseNode);

    const result =
      buildSequence({
        nodes: caseBody,
        context: switchContext,
        start: caseEntry,
      });

    if (result.fallthrough) {
      if (index < cases.length - 1) {
        previousCaseExit = result.node;
      } else {
        connect({
          graph: context.graph,
          source: result.node,
          target: joinNode,
          kind: CFG_EDGE_KINDS.NORMAL,
        });

        previousCaseExit = null;
      }
    } else {
      previousCaseExit = null;
    }
  }

  if (!hasExplicitDefault) {
    connect({
      graph: context.graph,
      source: switchNode,
      target: joinNode,
      kind: CFG_EDGE_KINDS.DEFAULT,
      metadata: {
        unmatched: true,
      },
    });
  }

  const hasReachableSwitchExit =
    Array.isArray(joinNode.incoming) &&
    joinNode.incoming.length > 0;

  if (!hasReachableSwitchExit) {
    context.graph.nodes.delete(
      joinNode.id,
    );

    return {
      node: switchNode,
      fallthrough: false,
    };
  }

  return {
    node: joinNode,
    fallthrough: true,
  };
};

const createFinallyCompletionNode = ({
  graph,
  completion,
}) => {
  const completionName =
    completion.edgeKind === CFG_EDGE_KINDS.RETURN
      ? 'FINALLY_RETURN'
      : completion.edgeKind === CFG_EDGE_KINDS.BREAK
        ? 'FINALLY_BREAK'
        : completion.edgeKind === CFG_EDGE_KINDS.CONTINUE
          ? 'FINALLY_CONTINUE'
          : completion.edgeKind === CFG_EDGE_KINDS.THROW
            ? 'FINALLY_THROW'
            : 'FINALLY_COMPLETION';

  return createNode({
    graph,
    kind: CFG_NODE_KINDS.JOIN,
    astNode: null,
    label: completionName,
    metadata: {
      synthetic: true,
      controlType: 'finally_completion',
      completion: completion.edgeKind,
    },
  });
};

const deduplicateFinallyCompletions = (
  completions,
) => {
  const unique = [];
  const seen = new Set();

  for (const completion of completions) {
    if (!completion?.target) {
      continue;
    }

    /*
     * Target identity matters.
     *
     * Two returns to EXIT can share one completion node,
     * while different break/continue/throw destinations
     * must remain separate.
     */
    const key = [
      completion.edgeKind,
      completion.target,
    ];

    if (
      unique.some(
        (item) =>
          item.edgeKind === key[0] &&
          item.target === key[1],
      )
    ) {
      continue;
    }

    seen.add(completion);
    unique.push(completion);
  }

  return unique;
};

const buildTry = ({
  node,
  context,
  start,
  incomingEdgeKind,
}) => {
  const tryBody =
    getTryBody(node);

  const catchClause =
    getCatchClause(node);

  const finallyClause =
    getFinallyClause(node);

  const tryEntry =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.TRY,
      astNode: node,
      label: 'TRY',
      metadata: {
        synthetic: true,
        controlType: 'try',
        hasCatch: Boolean(catchClause),
        hasFinally: Boolean(finallyClause),
      },
    });

  connect({
    graph: context.graph,
    source: start,
    target: tryEntry,
    kind: incomingEdgeKind,
  });

  const catchEntry =
    catchClause
      ? createNode({
          graph: context.graph,
          kind: CFG_NODE_KINDS.CATCH,
          astNode: catchClause,
          label: 'CATCH',
          metadata: {
            synthetic: true,
            controlType: 'catch',
            parameter:
              getCatchParameter(catchClause)?.text ||
              null,
          },
        })
      : null;

  const finallyEntry =
    finallyClause
      ? createNode({
          graph: context.graph,
          kind: CFG_NODE_KINDS.FINALLY,
          astNode: finallyClause,
          label: 'FINALLY',
          metadata: {
            synthetic: true,
            controlType: 'finally',
          },
        })
      : null;

  const joinNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.JOIN,
      astNode: null,
      label: 'TRY_EXIT',
      metadata: {
        synthetic: true,
        controlType: 'try',
      },
    });

  const finallyState = finallyEntry
    ? {
        entry: finallyEntry,
        completions: [],
      }
    : null;

  const tryContext = {
    ...context,
    exceptionTargets: catchEntry
      ? [
          ...context.exceptionTargets,
          catchEntry,
        ]
      : context.exceptionTargets,
    finallyTargets: finallyState
      ? [
          ...context.finallyTargets,
          finallyState,
        ]
      : context.finallyTargets,
  };

  const tryResult =
    tryBody
      ? buildNode({
          node: tryBody,
          context: tryContext,
          start: tryEntry,
          incomingEdgeKind:
            CFG_EDGE_KINDS.NORMAL,
        })
      : {
          node: tryEntry,
          fallthrough: true,
        };

  /*
   * Normal completion of try.
   */
  if (tryResult.fallthrough) {
    if (finallyEntry) {
      connect({
        graph: context.graph,
        source: tryResult.node,
        target: finallyEntry,
        kind: CFG_EDGE_KINDS.NORMAL,
        metadata: {
          from: 'try',
          completion: 'normal',
        },
      });
    } else {
      connect({
        graph: context.graph,
        source: tryResult.node,
        target: joinNode,
        kind: CFG_EDGE_KINDS.NORMAL,
      });
    }
  }

  /*
   * Catch execution.
   *
   * Explicit throw nodes and implicit exception edges from
   * potentially-throwing statements both enter here.
   */
  if (catchEntry && catchClause) {
    const catchBody =
      getCatchBody(catchClause);

    const catchContext = {
      ...context,
      exceptionTargets:
        context.exceptionTargets,
      finallyTargets: finallyState
        ? [
            ...context.finallyTargets,
            finallyState,
          ]
        : context.finallyTargets,
    };

    const catchResult =
      catchBody
        ? buildNode({
            node: catchBody,
            context: catchContext,
            start: catchEntry,
            incomingEdgeKind:
              CFG_EDGE_KINDS.EXCEPTION,
          })
        : {
            node: catchEntry,
            fallthrough: true,
          };

    if (catchResult.fallthrough) {
      if (finallyEntry) {
        connect({
          graph: context.graph,
          source: catchResult.node,
          target: finallyEntry,
          kind: CFG_EDGE_KINDS.NORMAL,
          metadata: {
            from: 'catch',
            completion: 'normal',
          },
        });
      } else {
        connect({
          graph: context.graph,
          source: catchResult.node,
          target: joinNode,
          kind: CFG_EDGE_KINDS.NORMAL,
        });
      }
    }
  }

  /*
   * Finally execution.
   */
  if (finallyEntry && finallyClause) {
    const finallyBody =
      getFinallyBody(finallyClause);

    const finallyContext = {
      ...context,
      exceptionTargets:
        context.exceptionTargets,
      finallyTargets:
        context.finallyTargets,
    };

    const finallyResult =
      finallyBody
        ? buildNode({
            node: finallyBody,
            context: finallyContext,
            start: finallyEntry,
            incomingEdgeKind:
              CFG_EDGE_KINDS.NORMAL,
          })
        : {
            node: finallyEntry,
            fallthrough: true,
          };

    if (finallyResult.fallthrough) {
      connect({
        graph: context.graph,
        source: finallyResult.node,
        target: joinNode,
        kind: CFG_EDGE_KINDS.NORMAL,
        metadata: {
          completion: 'normal',
        },
      });

      /*
       * Multiple returns may share the same destination.
       * Deduplicate by target identity + completion kind.
       */
      const completions =
        deduplicateFinallyCompletions(
          finallyState.completions,
        );

      for (const completion of completions) {
        const completionNode =
          createFinallyCompletionNode({
            graph: context.graph,
            completion,
          });

        connect({
          graph: context.graph,
          source: finallyResult.node,
          target: completionNode,
          kind: CFG_EDGE_KINDS.NORMAL,
          metadata: {
            afterFinally: true,
            completion:
              completion.edgeKind,
          },
        });

        connect({
          graph: context.graph,
          source: completionNode,
          target: completion.target,
          kind: completion.edgeKind,
          metadata: {
            afterFinally: true,
            completion:
              completion.edgeKind,
          },
        });
      }
    }
  }

  return {
    node: joinNode,
    fallthrough: true,
  };
};

const buildFunctionBody = ({
  node,
  context,
  start,
  incomingEdgeKind,
}) => {
  const functionNode =
    createNode({
      graph: context.graph,
      kind: CFG_NODE_KINDS.STATEMENT,
      astNode: node,
      metadata: {
        controlType: 'function',
        functionName:
          getFunctionName(node),
      },
    });

  connect({
    graph: context.graph,
    source: start,
    target: functionNode,
    kind: incomingEdgeKind,
  });

  return {
    node: functionNode,
    fallthrough: true,
  };
};

const buildFunctionControlFlow = ({
  functionNode,
  filePath = null,
  language = null,
} = {}) => {
  if (!functionNode) {
    return null;
  }

  const graph =
    new ControlFlowGraph({
      filePath,
      language,
      functionName:
        getFunctionName(functionNode),
    });

  const {
    entry,
    exit,
  } = createEntryExit(graph);

  const context = {
    graph,
    exit,
    breakTargets: [],
    continueTargets: [],
    exceptionTargets: [],
    finallyTargets: [],
  };

  const body =
    getChildren(functionNode).find(
      (child) => isBlockNode(child),
    );

  if (!body) {
    connect({
      graph,
      source: entry,
      target: exit,
    });

    return graph;
  }

  const result =
    buildBlock({
      node: body,
      context,
      start: entry,
      incomingEdgeKind:
        CFG_EDGE_KINDS.NORMAL,
    });

  if (result.fallthrough && result.node) {
    connect({
      graph,
      source: result.node,
      target: exit,
    });
  }

  return graph;
};

const buildControlFlowGraph = ({
  ast,
  filePath = null,
  language = null,
  functionName = null,
} = {}) => {
  return buildCfg({
    ast,
    filePath,
    language,
    functionName,
  });
};

const buildFunctionControlFlowGraph = ({
  functionNode,
  filePath = null,
  language = null,
} = {}) => {
  return buildFunctionControlFlow({
    functionNode,
    filePath,
    language,
  });
};

export {
  buildCfg,
  buildControlFlowGraph,
  buildFunctionControlFlow,
  buildFunctionControlFlowGraph,
};

export default buildControlFlowGraph;