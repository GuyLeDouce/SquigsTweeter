import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1),
  OPENSEA_API_KEY: z.string().min(1),
  NFT_CONTRACT_ADDRESS: z.string().min(1),
  CHAIN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().url().safeParse(value).success, {
      message: "Invalid url"
    }),
  DEFAULT_HASHTAG: z.string().default("#SquigsAreWatching"),
  DEFAULT_DISCORD_URL: z.string().default(""),
  DEFAULT_SITE_URL: z.string().default("")
});

export function getEnv() {
  return envSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENSEA_API_KEY: process.env.OPENSEA_API_KEY,
    NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS,
    CHAIN: process.env.CHAIN,
    DATABASE_URL: process.env.DATABASE_URL,
    APP_BASE_URL: process.env.APP_BASE_URL?.trim(),
    DEFAULT_HASHTAG: process.env.DEFAULT_HASHTAG ?? "#SquigsAreWatching",
    DEFAULT_DISCORD_URL: process.env.DEFAULT_DISCORD_URL ?? "",
    DEFAULT_SITE_URL: process.env.DEFAULT_SITE_URL ?? ""
  });
}
