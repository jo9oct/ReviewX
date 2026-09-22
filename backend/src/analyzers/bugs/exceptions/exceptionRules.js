
export const exceptionRules = Object.freeze({
  emptyCatch: {
    id: "BUG-EXCEPTION-001",
    title:
      "Empty exception handler.",
    description:
      "A catch block contains no visible error-handling logic.",
    severity: "medium",
    confidence: "high",
    recommendation:
      "Handle the exception explicitly or propagate it to an appropriate error handler."
  },

  swallowedError: {
    id: "BUG-EXCEPTION-002",
    title:
      "Potentially swallowed exception.",
    description:
      "An exception is caught without clear propagation or recovery behavior.",
    severity: "medium",
    confidence: "medium",
    recommendation:
      "Log useful context and propagate, transform, or intentionally handle the error."
  },

  consoleOnlyCatch: {
    id: "BUG-EXCEPTION-003",
    title:
      "Exception handler only logs the error.",
    description:
      "A catch block appears to only log an exception without clear recovery or propagation.",
    severity: "low",
    confidence: "medium",
    recommendation:
      "Return an appropriate response, propagate the error, or implement explicit recovery behavior."
  },

  expressAsyncHandler: {
    id: "BUG-EXCEPTION-004",
    title:
      "Async Express handler may not propagate errors.",
    description:
      "An async Express route handler may reject without explicit error propagation or centralized handling.",
    severity: "medium",
    confidence: "low",
    recommendation:
      "Use Express 5 promise handling, an async wrapper, or explicit next(error) handling as appropriate."
  }
});