export const typeRules = Object.freeze({
  invalidTypeof: {
    id: "BUG-TYPE-001",
    title:
      "Invalid typeof comparison.",
    description:
      "The typeof operator is compared with a value that JavaScript does not return.",
    severity: "medium",
    confidence: "high",
    recommendation:
      "Use a valid typeof result such as string, number, boolean, object, undefined, function, bigint, or symbol."
  }
});