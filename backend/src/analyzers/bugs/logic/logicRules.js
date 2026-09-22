
export const logicRules = Object.freeze({
  assignmentInCondition: {
    id: "BUG-LOGIC-001",
    title:
      "Assignment used inside a conditional expression.",
    description:
      "An assignment operator appears inside a conditional expression and may indicate an unintended comparison.",
    severity: "high",
    confidence: "high",
    recommendation:
      "Verify that the assignment is intentional. If comparison was intended, use the appropriate comparison operator."
  },

  unreachableCode: {
    id: "BUG-LOGIC-002",
    title:
      "Potential unreachable statement.",
    description:
      "A statement appears after an unconditional control-flow exit.",
    severity: "medium",
    confidence: "high",
    recommendation:
      "Remove unreachable code or adjust the control flow."
  },

  emptyBranch: {
    id: "BUG-LOGIC-003",
    title:
      "Conditional branch contains no effective logic.",
    description:
      "A conditional branch appears to contain no executable behavior.",
    severity: "low",
    confidence: "medium",
    recommendation:
      "Verify that the empty branch is intentional or implement the required behavior."
  },

  contradictoryCondition: {
    id: "BUG-LOGIC-004",
    title:
      "Potential contradictory conditional logic.",
    description:
      "The condition contains mutually incompatible comparisons.",
    severity: "medium",
    confidence: "high",
    recommendation:
      "Review the condition and verify that all comparisons can be true together."
  },

  staticFalseLoop: {
    id: "BUG-LOGIC-005",
    title:
      "Loop condition is statically false.",
    description:
      "The loop condition is always false, so its body cannot execute.",
    severity: "medium",
    confidence: "high",
    recommendation:
      "Verify the loop condition and remove the loop if its body is not intended to execute."
  },

  staticTrueLoop: {
    id: "BUG-LOGIC-006",
    title:
      "Potential infinite loop.",
    description:
      "A loop uses a constant true condition and may never terminate.",
    severity: "medium",
    confidence: "medium",
    recommendation:
      "Verify that the loop contains a reachable termination condition."
  }
});