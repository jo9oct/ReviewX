import {
  aiConfig
} from "../config/ai.js";

import {
  createProvider
} from "./providers/providerFactory.js";

import {
  buildAIContext
} from "./aiContextBuilder.js";

import {
  validateAIResponse
} from "./schemas/aiResponse.schema.js";

import {
  normalizeAIResponse
} from "./aiNormalizer.js";

export async function analyzeWithAI({
  context,
  findings,
  access
}) {
  if (
    !aiConfig.enabled
  ) {
    return {
      status: "disabled",
      provider: null,
      model: null,
      summary: null,
      findings: [],
      recommendations: []
    };
  }

  if (
    access?.features?.ai !== true
  ) {
    return {
      status: "not_available",
      provider: null,
      model: null,
      summary: null,
      findings: [],
      recommendations: []
    };
  }

  const maxFindings =
    Number(
      access?.limits
        ?.maxAiFindings
    ) || 0;

  if (
    maxFindings <= 0
  ) {
    return {
      status: "limit_reached",
      provider: null,
      model: null,
      summary: null,
      findings: [],
      recommendations: []
    };
  }

  try {
    const provider =
      createProvider();

    const aiContext =
      buildAIContext({
        context,
        findings,
        maxFindings
      });

    const response =
      await provider.analyze(
        aiContext
      );

    const validation =
      validateAIResponse(
        response
      );

    if (
      !validation.valid
    ) {
      throw new Error(
        "AI returned an invalid response."
      );
    }

    return normalizeAIResponse(
      response,
      {
        provider:
          provider.name,
        model:
          provider.model
      }
    );
  } catch (error) {
    return {
      status: "failed",

      provider:
        aiConfig.provider,

      model:
        null,

      summary:
        null,

      findings:
        [],

      recommendations:
        [],

      errors: [
        error instanceof Error
          ? error.message
          : "AI analysis failed."
      ]
    };
  }
}