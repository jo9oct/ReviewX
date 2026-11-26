import { client } from "../config/smtp.config.js";
import {
  VERIFICATION_EMAIL_REQUEST_TEMPLATE,
  WELCOME_EMAIL_REQUEST_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE,
} from "./emailTemplates.js";

const getSender = () => {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  if (!fromEmail) {
    throw new Error("SMTP_FROM_EMAIL or SMTP_USER must be configured.");
  }

  return {
    name: process.env.SMTP_FROM_NAME || "ReviewX",
    address: fromEmail,
  };
};

const sendEmail = async (message) => {
  const replyTo = message.replyTo || process.env.SMTP_REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL;
  const response = await client.sendMail({
    ...message,
    ...(replyTo ? { replyTo } : {}),
  });
  const requestedRecipient = String(message.to).trim().toLowerCase();
  const accepted = Array.isArray(response.accepted) ? response.accepted : [];
  const rejected = Array.isArray(response.rejected) ? response.rejected : [];
  const wasAccepted = accepted.some(
    (recipient) => String(recipient).trim().toLowerCase() === requestedRecipient
  );

  if (rejected.length > 0 || !wasAccepted) {
    const error = new Error("SMTP did not accept the requested recipient.");
    error.code = "SMTP_RECIPIENT_REJECTED";
    error.acceptedCount = accepted.length;
    error.rejectedCount = rejected.length;
    throw error;
  }

  return response;
};

export const sendVerificationEmail = async (
  email,
  verificationToken,
  explore_link,
  FullName,
  Support_Email,
  year
) => {
  if (!explore_link) {
    throw new Error("A verification URL must be provided from environment configuration.");
  }

  const response = await sendEmail({
    from: getSender(),
    to: email,
    subject: "Verify your ReviewX account",
    html: VERIFICATION_EMAIL_REQUEST_TEMPLATE
      .replace("{{first_name}}", FullName || "User")
      .replace("{{verification_code}}", verificationToken)
      .replace("{{verification_link}}", explore_link)
      .replace("{{support_email}}", Support_Email || process.env.SUPPORT_EMAIL || "jops7326@gmail.com")
      .replace("{{year}}", year || new Date().getFullYear()),
    category: "Authentication",
  });

  console.log("Verification email accepted by SMTP.");
  return response;
};

export const sendWelcomeEmail = async (
  email,
  name,
  logo,
  explore_link,
  support_email,
  year
) => {
  if (!explore_link) {
    throw new Error("A frontend URL must be provided from environment configuration.");
  }

  const response = await sendEmail({
    from: getSender(),
    to: email,
    subject: "Welcome to ReviewX!",
    html: WELCOME_EMAIL_REQUEST_TEMPLATE
      .replace("{{logo_url}}", logo || "")
      .replace("{{first_name}}", name || "User")
      .replace("{{explore_link}}", explore_link)
      .replace("{{support_email}}", support_email || process.env.SUPPORT_EMAIL || "jops7326@gmail.com")
      .replace("{{year}}", year || new Date().getFullYear()),
    category: "Welcome",
  });

  console.log("Welcome email accepted by SMTP.");
  return response;
};

export const sendPasswordResetEmail = async (
  email,
  resetLink,
  name,
  logo,
  support_email,
  year
) => {
  if (!resetLink) {
    throw new Error("A password reset link must be provided.");
  }

  const response = await sendEmail({
    from: getSender(),
    to: email,
    subject: "Reset your ReviewX password",
    html: PASSWORD_RESET_REQUEST_TEMPLATE
      .replace("{{logo_url}}", logo || "")
      .replace("{{first_name}}", name || "User")
      .replaceAll("{{reset_link}}", resetLink)
      .replace("{{support_email}}", support_email || process.env.SUPPORT_EMAIL || "jops7326@gmail.com")
      .replace("{{year}}", year || new Date().getFullYear()),
    category: "Password Reset",
  });

  console.log("Password reset email accepted by SMTP.");
  return response;
};

export const sendResetSuccessEmail = async (
  email,
  logo,
  name,
  login_link,
  support_email,
  year
) => {
  const response = await sendEmail({
    from: getSender(),
    to: email,
    subject: "Password Reset Successful - ReviewX",
    html: PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE
      .replace("{{logo_url}}", logo || "")
      .replace("{{first_name}}", name || "User")
      .replace("{{login_link}}", login_link)
      .replace("{{support_email}}", support_email || process.env.SUPPORT_EMAIL || "jops7326@gmail.com")
      .replace("{{year}}", year || new Date().getFullYear()),
    category: "Security",
  });

  console.log("Password reset success email accepted by SMTP.");
  return response;
};

export const sendFeedbackEmail = async ({ category, email, message }) => {
  const recipient = process.env.FEEDBACK_RECIPIENT_EMAIL;
  if (!recipient) {
    throw new Error("FEEDBACK_RECIPIENT_EMAIL must be configured.");
  }

  const categoryNames = {
    general: "General feedback",
    bug: "Bug report",
    feature: "Feature request",
  };
  const categoryName = categoryNames[category];
  if (!categoryName) {
    throw new Error("Feedback category is invalid.");
  }

  const text = [
    `Category: ${categoryName}`,
    `Reply email: ${email || "Not provided"}`,
    "",
    message,
  ].join("\n");

  const response = await sendEmail({
    from: getSender(),
    to: recipient,
    ...(email ? { replyTo: email } : {}),
    subject: `ReviewX feedback: ${categoryName}`,
    text,
  });

  console.log("Feedback email accepted by SMTP.");
  return response;
};
