
import {
  aiResponseSchema
} from "./schemas/aiResponse.schema.js";

export function normalizeAIResponse(
  value
) {
  const {
    error,
    value: validated
  } =
    aiResponseSchema.validate(
      value,
      {
        abortEarly: false,
        stripUnknown: true
      }
    );

  if (error) {
    throw new Error(
      `Invalid AI response: ${error.message}`
    );
  }

  return {
    summary:
      validated.summary.trim(),

    findings:
      validated.findings.map(
        normalizeFinding
      ),

    recommendations:
      validated.recommendations
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean)
  };
}

function normalizeFinding(
  finding
) {
  return {
    findingFingerprint:
      finding.findingFingerprint,

    explanation:
      finding.explanation.trim(),

    impact:
      finding.impact.trim(),

    fix:
      finding.fix.trim(),

    improvedCode:
      finding.improvedCode,

    securityExplanation:
      finding.securityExplanation.trim()
  };
}