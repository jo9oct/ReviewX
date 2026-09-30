const ALLOWED_NOTIFICATION_TYPES =
  new Set([
    "review.completed",
    "review.failed",
    "report.completed",
    "report.failed",
  ]);

const normalizeType = (type) => {
  const normalized =
    String(type || "").trim();

  if (
    !ALLOWED_NOTIFICATION_TYPES.has(
      normalized,
    )
  ) {
    throw new Error(
      `Unsupported notification type: ${normalized}`,
    );
  }

  return normalized;
};

const buildMessage = ({
  type,
  reviewId,
  reportId,
}) => {
  switch (type) {
    case "review.completed":
      return {
        subject:
          "Code review completed",
        text:
          `The code review ${reviewId} has completed.`,
      };

    case "review.failed":
      return {
        subject:
          "Code review failed",
        text:
          `The code review ${reviewId} failed.`,
      };

    case "report.completed":
      return {
        subject:
          "Code review report completed",
        text:
          `The report ${reportId} has completed.`,
      };

    case "report.failed":
      return {
        subject:
          "Code review report failed",
        text:
          `The report ${reportId} failed.`,
      };

    default:
      throw new Error(
        "Unsupported notification type.",
      );
  }
};

export const createNotificationService =
  ({
    emailNotification,
  }) => {
    if (
      !emailNotification ||
      typeof emailNotification.send !==
        "function"
    ) {
      throw new TypeError(
        "Email notification provider is required.",
      );
    }

    return {
      async send({
        notificationType,
        recipient,
        payload = {},
      }) {
        const type =
          normalizeType(
            notificationType,
          );

        const message =
          buildMessage({
            type,
            reviewId:
              payload.reviewId,
            reportId:
              payload.reportId,
          });

        return emailNotification.send({
          recipient,
          subject:
            message.subject,
          text:
            message.text,
        });
      },
    };
  };