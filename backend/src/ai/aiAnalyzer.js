
import {
  normalizeAIResponse
} from "./aiNormalizer.js";

export async function analyzeWithAI({
  provider,
  system,
  user,
  maxOutputTokens
}) {
  const response =
    await provider.generate({
      system,
      user,
      maxOutputTokens
    });

  const parsed =
    parseJSON(
      response.content
    );

  const normalized =
    normalizeAIResponse(
      parsed
    );

  return {
    ...normalized,
    provider:
      response.provider,
    model:
      response.model,
    status: "completed"
  };
}

function parseJSON(
  content
) {
  try {
    return JSON.parse(
      content
    );
  } catch {
    const fenced =
      content.match(
        /```(?:json)?\s*([\s\S]*?)\s*```/i
      );

    if (!fenced) {
      throw new Error(
        "AI response is not valid JSON."
      );
    }

    return JSON.parse(
      fenced[1]
    );
  }
}