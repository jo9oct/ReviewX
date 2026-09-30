const normalizeRecipient = (
  recipient,
) => {
  if (
    typeof recipient !== "string" ||
    !recipient.trim()
  ) {
    throw new TypeError(
      "Email recipient is required.",
    );
  }

  return recipient.trim();
};

export const createEmailNotification =
  ({
    transport,
  }) => {
    if (
      !transport ||
      typeof transport.sendMail !==
        "function"
    ) {
      throw new TypeError(
        "A mail transport with sendMail is required.",
      );
    }

    return {
      async send({
        recipient,
        subject,
        text,
        html,
      }) {
        const to =
          normalizeRecipient(
            recipient,
          );

        return transport.sendMail({
          to,
          subject:
            subject ||
            "Code Review Notification",
          text:
            text ||
            "",
          html:
            html ||
            undefined,
        });
      },
    };
  };