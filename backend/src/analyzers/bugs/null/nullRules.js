export const nullRules = Object.freeze({
  unsafeNullableAccess: {
    id: "BUG-NULL-001",
    title:
      "Potential null or undefined access.",
    description:
      "A value that may be null or undefined is accessed without an obvious null or undefined guard.",
    severity: "medium",
    confidence: "medium",
    recommendation:
      "Validate the value before accessing its properties or methods. Use an explicit null check, optional chaining, or an appropriate default value."
  },

  pythonNoneAccess: {
    id: "BUG-NULL-002",
    title:
      "Potential None attribute access.",
    description:
      "A value that may be None is accessed through an attribute without an obvious None guard.",
    severity: "medium",
    confidence: "medium",
    recommendation:
      "Check that the value is not None before accessing its attributes or methods."
  }
});