import { NextResponse } from "next/server";
import { z } from "zod";
import { getNftByTokenId } from "@/lib/opensea";
import { saveGeneratedTweet } from "@/lib/db";
import { generateTweets } from "@/lib/openai";
import { markTokenUsed, getRecentGenerations } from "@/lib/repetition";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  tokenId: z.string().optional(),
  controls: z.object({
    tone: z.enum([
      "bullish",
      "funny",
      "lore",
      "community",
      "collector",
      "chaotic",
      "shill-lite"
    ]),
    hashtagEnabled: z.boolean(),
    ctaMode: z.enum(["discord", "website", "none"]),
    lengthMode: z.enum(["short", "medium", "punchy-max"]),
    excludeRecent: z.boolean(),
    humanized: z.boolean(),
    campaignMode: z.enum([
      "Everyday",
      "Mint Push",
      "Community Spotlight",
      "Lore Post",
      "Game/Event Post",
      "Collector Flex"
    ])
  })
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    if (!body.tokenId) {
      return NextResponse.json({ error: "A tokenId is required for generation." }, { status: 400 });
    }

    const nft = await getNftByTokenId(body.tokenId);
    const recentExamples = await getRecentGenerations();
    const content = await generateTweets({
      nft,
      controls: body.controls,
      recentExamples
    });

    const record = await saveGeneratedTweet({
      nft,
      controls: body.controls,
      content
    }).catch((error) => {
      console.error("Saving generation failed", error);
      return null;
    });

    await markTokenUsed(nft.tokenId).catch((error) => {
      console.error("Marking token used failed", error);
    });

    return NextResponse.json({
      nft,
      content,
      record
    });
  } catch (error) {
    console.error("Generate route failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed."
      },
      { status: 500 }
    );
  }
}
