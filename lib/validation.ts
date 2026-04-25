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

const blockedPhrases = [
  /\bgm\s+(family|fam|frens)\b/i,
  /\bhuge alpha\b/i,
  /\bmassive utility\b/i,
  /\bdon'?t miss out\b/i,
  /\brevolutionary\b/i,
  /\bever[- ]evolving\b/i,
  /\bunlock (exclusive )?(benefits|utility|value|opportunities)\b/i,
  /\bjoin our (amazing|incredible|vibrant) community\b/i,
  /\bwe (are|'re) (thrilled|excited|proud) to (announce|present|share)\b/i,
  /\bperfect blend of\b/i,
  /\bgame[- ]changer\b/i,
  /\btake (your|the) .* to the next level\b/i
];

function assertNoSlopPhrases(content: GeneratedContent) {
  const fields = [
    content.mainTweet,
    content.altTweet1,
    content.altTweet2,
    content.firstReply
  ];

  const blocked = fields.find((field) =>
    blockedPhrases.some((pattern) => pattern.test(field))
  );

  if (blocked) {
    throw new Error(`Model output used generic promo phrasing: "${blocked}"`);
  }
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

  assertNoSlopPhrases(cleaned);

  return cleaned;
}
