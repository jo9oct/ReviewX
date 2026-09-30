import environment from './environment.js';

const aiConfig = Object.freeze({
  enabled:
    process.env.AI_ENABLED === 'true',

  provider:
    process.env.AI_PROVIDER || 'groq',

  timeoutMs:
    Number.parseInt(
      process.env.AI_TIMEOUT_MS || '30000',
      10
    ),

  maxFindings:
    Number.parseInt(
      process.env.AI_MAX_FINDINGS || '15',
      10
    ),

  maxSourceBytes:
    Number.parseInt(
      process.env.AI_MAX_SOURCE_BYTES || '4000',
      10
    ),

  maxContextBytes:
    Number.parseInt(
      process.env.AI_MAX_CONTEXT_BYTES || '8000',
      10
    ),

  groq: Object.freeze({
    apiKey:
      process.env.GROQ_API_KEY || '',

    model:
      process.env.GROQ_MODEL ||
      'llama-3.3-70b-versatile'
  }),

  openai: Object.freeze({
    apiKey:
      process.env.OPENAI_API_KEY || '',

    model:
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini'
  }),

  temperature:
    Number.parseFloat(
      process.env.AI_TEMPERATURE || '0'
    ),

  maxOutputTokens:
    Number.parseInt(
      process.env.AI_MAX_OUTPUT_TOKENS || '3000',
      10
    ),

  environment: environment.nodeEnv
});

export default aiConfig;