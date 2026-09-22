
export const resourceRules = Object.freeze({
  fileResource: {
    id: "BUG-RESOURCE-001",
    title:
      "File resource may not be released.",
    description:
      "A file stream or file resource is created without an obvious cleanup operation.",
    severity: "medium",
    confidence: "low",
    recommendation:
      "Ensure the file descriptor or stream is properly closed, destroyed, or consumed according to the API being used."
  },

  databaseResource: {
    id: "BUG-RESOURCE-002",
    title:
      "Database resource may not be released.",
    description:
      "A database connection or pool resource is created without visible cleanup.",
    severity: "medium",
    confidence: "low",
    recommendation:
      "Release connections when appropriate and use pool-managed lifecycle handling."
  },

  eventListener: {
    id: "BUG-RESOURCE-003",
    title:
      "Event listener may accumulate.",
    description:
      "An event listener is registered and may remain attached across repeated executions.",
    severity: "low",
    confidence: "low",
    recommendation:
      "Remove listeners when their lifecycle ends, especially for repeatedly created objects."
  },

  timer: {
    id: "BUG-RESOURCE-004",
    title:
      "Timer may not be cleared.",
    description:
      "A timer is created without visible cleanup.",
    severity: "low",
    confidence: "low",
    recommendation:
      "Clear timers when the associated operation or request lifecycle ends."
  }
});