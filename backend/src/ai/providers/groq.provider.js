
import Groq from "groq-sdk";

import {
  aiConfig
} from "../../config/ai.js";

export class GroqProvider {
  constructor() {
    if (!aiConfig.groq.apiKey) {
      throw new Error(
        "GROQ_API_KEY is not configured."
      );
    }

    this.client =
      new Groq({
        apiKey:
          aiConfig.groq.apiKey,
        baseURL:
          aiConfig.groq.baseURL
      });

    this.name = "groq";
    this.model =
      aiConfig.groq.model;
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
        "Groq returned an empty response."
      );
    }

    return {
      provider: this.name,
      model: this.model,
      content: content.trim()
    };
  }
}