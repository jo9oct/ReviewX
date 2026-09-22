export const asyncRules = Object.freeze({
  unhandledPromise: {
    id: "BUG-ASYNC-001",
    title:
      "Potential unhandled promise.",
    description:
      "A likely promise-returning operation is called without an obvious await, return, assignment, or rejection handler.",
    severity: "medium",
    confidence: "medium",
    recommendation:
      "Await the promise, return it to the caller, store it for later handling, or attach appropriate rejection handling."
  }
});