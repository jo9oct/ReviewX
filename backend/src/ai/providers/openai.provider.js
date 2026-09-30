import aiConfig from '../../config/ai.config.js';

class OpenAIProvider {
  constructor({
    apiKey =
      aiConfig.openai.apiKey,

    model =
      aiConfig.openai.model,

    timeoutMs =
      aiConfig.timeoutMs
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  get name() {
    return 'openai';
  }

  isConfigured() {
    return Boolean(
      this.apiKey
    );
  }

  async complete({
    system,
    user
  }) {
    if (!this.isConfigured()) {
      throw new Error(
        'OpenAI provider is not configured.'
      );
    }

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        this.timeoutMs
      );

    try {
      const response =
        await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',

            headers: {
              Authorization:
                `Bearer ${this.apiKey}`,

              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              model:
                this.model,

              temperature:
                aiConfig.temperature,

              max_tokens:
                aiConfig.maxOutputTokens,

              response_format: {
                type: 'json_object'
              },

              messages: [
                {
                  role: 'system',
                  content:
                    system
                },
                {
                  role: 'user',
                  content:
                    user
                }
              ]
            }),

            signal:
              controller.signal
          }
        );

      if (!response.ok) {
        const message =
          await response
            .text()
            .catch(
              () => ''
            );

        throw new Error(
          `OpenAI request failed with status ${response.status}: ${message.slice(
            0,
            500
          )}`
        );
      }

      const data =
        await response.json();

      const content =
        data?.choices?.[0]
          ?.message?.content;

      if (
        typeof content !==
        'string'
      ) {
        throw new Error(
          'OpenAI returned an invalid response.'
        );
      }

      return content;
    } finally {
      clearTimeout(
        timeout
      );
    }
  }
}

export {
  OpenAIProvider
};