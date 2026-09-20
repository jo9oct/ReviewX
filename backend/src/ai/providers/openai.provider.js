
import OpenAI from "openai";

import {
  aiConfig
} from "../../config/ai.js";

export class OpenAIProvider {
  constructor() {
    if (!aiConfig.openai.apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured."
      );
    }

    this.client =
      new OpenAI({
        apiKey:
          aiConfig.openai.apiKey,
        baseURL:
          aiConfig.openai.baseURL
      });

    this.name = "openai";
    this.model =
      aiConfig.openai.model;
  }

  async generate({
    system,
    user,
    maxOutputTokens
  }) {
    const response =
      await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        max_tokens:
          maxOutputTokens,
        response_format: {
          type: "json_object"
        },
        messages: [
          {
            role: "system",
            content: system
          },
          {
            role: "user",
            content: user
          }
        ]
      });

    const content =
      response?.choices?.[0]
        ?.message?.content;

    if (
      typeof content !== "string" ||
      content.trim() === ""
    ) {
      throw new Error(
        "OpenAI returned an empty response."
      );
    }

    return {
      provider: this.name,
      model: this.model,
      content: content.trim()
    };
  }
}