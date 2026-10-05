import aiConfig from '../../config/ai.config.js';

const MAX_RATE_LIMIT_RETRIES = 2;

const sleep = (
  milliseconds
) =>
  new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );

const extractRetryDelayMs = (
  message,
  retryAfter
) => {
  const retryAfterSeconds =
    Number.parseFloat(
      retryAfter
    );

  if (
    Number.isFinite(
      retryAfterSeconds
    ) &&
    retryAfterSeconds > 0
  ) {
    return Math.ceil(
      retryAfterSeconds * 1000
    );
  }

  const match =
    message.match(
      /try again in\s+([\d.]+)s/i
    );

  if (
    match &&
    match[1]
  ) {
    const seconds =
      Number.parseFloat(
        match[1]
      );

    if (
      Number.isFinite(
        seconds
      ) &&
      seconds > 0
    ) {
      return Math.ceil(
        seconds * 1000
      );
    }
  }

  return 5000;
};

class GroqProvider {
  constructor({
    apiKey =
      aiConfig.groq.apiKey,

    model =
      aiConfig.groq.model,

    timeoutMs =
      aiConfig.timeoutMs
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  get name() {
    return 'groq';
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
        'Groq provider is not configured.'
      );
    }

    let rateLimitRetries = 0;

    while (true) {
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
            'https://api.groq.com/openai/v1/chat/completions',
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

          if (
            response.status ===
              429 &&
            rateLimitRetries <
              MAX_RATE_LIMIT_RETRIES
          ) {
            const retryAfter =
              response.headers.get(
                'retry-after'
              );

            const delayMs =
              extractRetryDelayMs(
                message,
                retryAfter
              );

            rateLimitRetries +=
              1;

            await sleep(
              delayMs
            );

            continue;
          }

          throw new Error(
            `Groq request failed with status ${response.status}: ${message.slice(
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
            'Groq returned an invalid response.'
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
}

export {
  GroqProvider
};