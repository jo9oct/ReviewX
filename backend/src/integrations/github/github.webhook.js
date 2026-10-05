import {
  verifyGithubWebhookSignature,
} from './github.auth.js';

const parseGithubWebhookEvent = ({
  payload,
  signature,
  event,
  deliveryId,
}) => {
  if (
    !verifyGithubWebhookSignature(
      payload,
      signature,
    )
  ) {
    const error = new Error(
      'Invalid GitHub webhook signature.',
    );

    error.code =
      'INVALID_GITHUB_WEBHOOK_SIGNATURE';

    error.statusCode = 401;

    throw error;
  }

  let parsedPayload;

  try {
    parsedPayload =
      Buffer.isBuffer(payload)
        ? JSON.parse(
            payload.toString('utf8'),
          )
        : typeof payload === 'string'
          ? JSON.parse(payload)
          : payload;
  } catch {
    const error = new Error(
      'GitHub webhook payload is invalid.',
    );

    error.code =
      'INVALID_GITHUB_WEBHOOK_PAYLOAD';

    error.statusCode = 400;

    throw error;
  }

  if (
    !parsedPayload ||
    typeof parsedPayload !==
      'object'
  ) {
    const error = new Error(
      'GitHub webhook payload must be an object.',
    );

    error.code =
      'INVALID_GITHUB_WEBHOOK_PAYLOAD';

    error.statusCode = 400;

    throw error;
  }

  return Object.freeze({
    event:
      typeof event === 'string'
        ? event
        : '',

    deliveryId:
      typeof deliveryId === 'string'
        ? deliveryId
        : '',

    payload:
      parsedPayload,
  });
};

export {
  parseGithubWebhookEvent,
};