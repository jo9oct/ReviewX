
import { env } from "./env.js";

export const aiConfig = Object.freeze({
  enabled:
    env.AI_ENABLED !== "false",

  provider:
    env.AI_PROVIDER ||
    "groq",

  groq: {
    apiKey:
      env.GROQ_API_KEY || "",

    model:
      env.GROQ_MODEL ||
      "openai/gpt-oss-20b",

    baseURL:
      env.GROQ_BASE_URL ||
      "https://api.groq.com/openai/v1"
  },

  openai: {
    apiKey:
      env.OPENAI_API_KEY || "",

    model:
      env.OPENAI_MODEL ||
      "gpt-4o-mini",

    baseURL:
      env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1"
  },

  limits: {
    maxFindings:
      Number(
        env.MAX_AI_FINDINGS ||
        20
      ),

    maxInputChars:
      Number(
        env.MAX_AI_INPUT_CHARS ||
        24000
      ),

    maxOutputTokens:
      Number(
        env.MAX_AI_OUTPUT_TOKENS ||
        4000
      ),

    retryDelayMs:
      Number(
        env.AI_RETRY_DELAY_MS ||
        1200
      )
  }
});