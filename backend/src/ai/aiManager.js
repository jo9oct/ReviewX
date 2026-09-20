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
  console.log(
    "=== AI ACCESS DEBUG ==="
  );

  console.log(
    "access:",
    JSON.stringify(
      access,
      null,
      2
    )
  );

  console.log(
    "access.features.ai:",
    access?.features?.ai
  );

  console.log(
    "access.features.pdf:",
    access?.features?.pdf
  );

  console.log(
    "access.limits.maxAiFindings:",
    access?.limits?.maxAiFindings
  );

  console.log(
    "AI enabled:",
    aiConfig.enabled
  );

  console.log(
    "AI provider:",
    aiConfig.provider
  );

  console.log(
    "======================="
  );

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

      model:
        null,

      summary:
        null,

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