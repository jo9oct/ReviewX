import {
  GroqProvider
} from "./groq.provider.js";

import {
  OpenAIProvider
} from "./openai.provider.js";

import {
  aiConfig
} from "../../config/ai.js";

export function createProvider(
  providerName =
    aiConfig.provider
) {
  switch (
    providerName
      .trim()
      .toLowerCase()
  ) {
    case "groq":
      return new GroqProvider();

    case "openai":
      return new OpenAIProvider();

    default:
      throw new Error(
        `Unsupported AI provider: ${providerName}`
      );
  }
}