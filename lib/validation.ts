import { z } from "zod";
import { GeneratedContent, GenerationPayload } from "@/lib/types";

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

function escapedPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCharacterAnchors(payload: GenerationPayload) {
  const anchors = new Set<string>();
  const tokenId = payload.nft.tokenId.trim();

  if (tokenId) {
    anchors.add(`#${tokenId}`);
    anchors.add(`Squig #${tokenId}`);
    anchors.add(`Token #${tokenId}`);
  }

  const name = payload.nft.name?.trim();

  if (name && !/^squig #?\d+$/i.test(name)) {
    anchors.add(name);
  }

  for (const trait of payload.nft.traits) {
    const value = trait.value.trim();

    if (value.length >= 3 && !/^(none|unknown|n\/a)$/i.test(value)) {
      anchors.add(value);
    }
  }

  return [...anchors].slice(0, 12);
}

function assertCharacterAnchored(content: GeneratedContent, payload: GenerationPayload) {
  const anchors = getCharacterAnchors(payload);

  if (!anchors.length) {
    return;
  }

  const pattern = new RegExp(
    anchors.map((anchor) => escapedPattern(anchor)).join("|"),
    "i"
  );

  const tweets = [content.mainTweet, content.altTweet1, content.altTweet2];
  const anchoredCount = tweets.filter((tweet) => pattern.test(tweet)).length;

  if (anchoredCount < 2) {
    throw new Error("Model output did not connect enough tweet variants to the selected Squig.");
  }
}

export function validateGeneratedContent(
  data: unknown,
  payload?: GenerationPayload
): GeneratedContent {
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

  if (payload) {
    assertCharacterAnchored(cleaned, payload);
  }

  return cleaned;
}
