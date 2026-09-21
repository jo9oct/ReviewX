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

import {
  normalizeAccess,
  assertAiAccess,
  getMaxAiFindings
} from "../services/analysisAccess.service.js";

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

  const normalizedAccess =
    normalizeAccess(
      access
    );

  if (
    !normalizedAccess.features.ai
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
    getMaxAiFindings(
      normalizedAccess
    );

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
    assertAiAccess(
      normalizedAccess
    );

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

    const parsed =
      parseAIContent(
        response.content
      );

    const validation =
      validateAIResponse(
        parsed
      );

    if (
      !validation.valid
    ) {
      throw new Error(
        `AI returned an invalid response: ${validation.error.message}`
      );
    }

    const normalized =
      normalizeAIResponse(
        validation.value
      );

    return {
      status: "completed",

      provider:
        provider.name,

      model:
        provider.model,

      summary:
        normalized.summary,

      findings:
        normalized.findings,

      recommendations:
        normalized.recommendations
    };
  } catch (error) {
    return {
      status: "failed",

      provider:
        aiConfig.provider,

      model: null,

      summary: null,

      findings: [],

      recommendations: [],

      errors: [
        error instanceof Error
          ? error.message
          : "AI analysis failed."
      ]
    };
  }
}

function parseAIContent(
  content
) {
  if (
    typeof content !==
    "string"
  ) {
    throw new Error(
      "AI returned invalid content."
    );
  }

  const cleaned =
    content
      .trim()
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  if (
    !cleaned
  ) {
    throw new Error(
      "AI returned empty content."
    );
  }

  try {
    return JSON.parse(
      cleaned
    );
  } catch {
    throw new Error(
      "AI returned invalid JSON."
    );
  }
}