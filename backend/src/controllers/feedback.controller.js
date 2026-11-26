import { sendFeedbackEmail } from "../email/emails.js";
import { sanitizeObject } from "../utils/sanitize.utils.js";
import { feedbackSchema } from "../validation/feedback.validation.js";

export const submitFeedback = async (req, res) => {
  const { error, value } = feedbackSchema.validate(sanitizeObject(req.body));
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details?.[0]?.message || "Invalid feedback.",
    });
  }

  try {
    await sendFeedbackEmail(value);
    return res.status(200).json({
      success: true,
      message: "Thank you. Your feedback has been sent.",
    });
  } catch (error) {
    console.error("Feedback email failed.", error.code || "EMAIL_ERROR");
    return res.status(502).json({
      success: false,
      message: "Feedback could not be sent right now. Please try again later.",
    });
  }
};
