import { z } from "zod";

const appConfigSchema = z.object({
  DEFAULT_HASHTAG: z.string().default("#SquigsAreWatching"),
  DEFAULT_DISCORD_URL: z.string().default(""),
  DEFAULT_SITE_URL: z.string().default(""),
  APP_BASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().url().safeParse(value).success, {
      message: "Invalid url"
    })
});

const openAiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1)
});

const openSeaEnvSchema = z.object({
  OPENSEA_API_KEY: z.string().min(1),
  NFT_CONTRACT_ADDRESS: z.string().min(1),
  CHAIN: z.string().min(1),
  MAX_TOKEN_ID: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || /^\d+$/.test(value), {
      message: "MAX_TOKEN_ID must be a whole number"
    })
});

export function getAppConfig() {
  return appConfigSchema.parse({
    APP_BASE_URL: process.env.APP_BASE_URL?.trim(),
    DEFAULT_HASHTAG: process.env.DEFAULT_HASHTAG ?? "#SquigsAreWatching",
    DEFAULT_DISCORD_URL: process.env.DEFAULT_DISCORD_URL ?? "",
    DEFAULT_SITE_URL: process.env.DEFAULT_SITE_URL ?? ""
  });
}

export function getOpenAiEnv() {
  return openAiEnvSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  });
}

export function getOpenSeaEnv() {
  return openSeaEnvSchema.parse({
    OPENSEA_API_KEY: process.env.OPENSEA_API_KEY,
    NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS,
    CHAIN: process.env.CHAIN,
    MAX_TOKEN_ID: process.env.MAX_TOKEN_ID?.trim(),
  });
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || null;
}
