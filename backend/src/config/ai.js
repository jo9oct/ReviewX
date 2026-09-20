import {
  env
} from "./env.js";

export const aiConfig = Object.freeze({
  enabled:
    env.ai.provider !== "disabled",

  provider:
    env.ai.provider,

  groq: {
    apiKey:
      env.ai.groqApiKey,

    model:
      env.ai.groqModel
  },

  openai: {
    apiKey:
      env.ai.openaiApiKey,

    model:
      env.ai.openaiModel ||
      "gpt-4o-mini",

    baseURL:
      "https://api.openai.com/v1"
  },

  limits: {
    maxFindings:
      env.ai.maxFindings,

    maxInputChars:
      env.ai.maxInputChars,

    maxOutputTokens:
      4000,

    retryDelayMs:
      1200
  }
});