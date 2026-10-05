import aiConfig from '../../config/ai.config.js';
import {
  GroqProvider
} from './groq.provider.js';

import {
  OpenAIProvider
} from './openai.provider.js';

const createProvider = (
  providerName =
    aiConfig.provider
) => {
  switch (
    providerName
      .trim()
      .toLowerCase()
  ) {
    case 'groq':
      return new GroqProvider();

    case 'openai':
      return new OpenAIProvider();

    default:
      throw new Error(
        `Unsupported AI provider: ${providerName}`
      );
  }
};

export {
  createProvider
};