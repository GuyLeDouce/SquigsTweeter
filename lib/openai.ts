import OpenAI from "openai";
import { getOpenAiEnv } from "@/lib/env";
import { buildPrompt } from "@/lib/prompts";
import { GenerationPayload } from "@/lib/types";
import { validateGeneratedContent } from "@/lib/validation";

export async function generateTweets(payload: GenerationPayload) {
  const env = getOpenAiEnv();
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY
  });
  const prompt = buildPrompt(payload);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: env.OPENAI_MODEL,
        input: [
          {
            role: "system",
            content:
              "You write character-led @SquigsNFT tweet copy that reflects the chosen campaign, tone, and CTA. Return JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "tweet_generation",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                hookStyle: {
                  type: "string"
                },
                mainTweet: {
                  type: "string"
                },
                altTweet1: {
                  type: "string"
                },
                altTweet2: {
                  type: "string"
                },
                firstReply: {
                  type: "string"
                }
              },
              required: ["hookStyle", "mainTweet", "altTweet1", "altTweet2", "firstReply"]
            }
          }
        }
      });

      const outputText = response.output_text;
      const parsed = JSON.parse(outputText);
      return validateGeneratedContent(parsed, payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to generate valid tweet copy from OpenAI.");
}
