import { z } from "zod";
import { GeneratedContent } from "@/lib/types";

const contentSchema = z.object({
  hookStyle: z.string().min(3).max(120),
  mainTweet: z.string().min(20).max(280),
  altTweet1: z.string().min(20).max(280),
  altTweet2: z.string().min(20).max(280),
  firstReply: z.string().min(12).max(280)
});

function normalized(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function validateGeneratedContent(data: unknown): GeneratedContent {
  const parsed = contentSchema.parse(data);

  const cleaned: GeneratedContent = {
    hookStyle: normalized(parsed.hookStyle),
    mainTweet: normalized(parsed.mainTweet),
    altTweet1: normalized(parsed.altTweet1),
    altTweet2: normalized(parsed.altTweet2),
    firstReply: normalized(parsed.firstReply)
  };

  const distinctCount = new Set([
    cleaned.mainTweet.toLowerCase(),
    cleaned.altTweet1.toLowerCase(),
    cleaned.altTweet2.toLowerCase()
  ]).size;

  if (distinctCount < 3) {
    throw new Error("Model output did not provide distinct tweet variants.");
  }

  return cleaned;
}
