import { NextResponse } from "next/server";
import { getRandomMintedNft } from "@/lib/alchemy";
import { getRecentTokenIds } from "@/lib/repetition";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeRecent = searchParams.get("excludeRecent") === "true";
    const excludeTokenIds = excludeRecent ? await getRecentTokenIds() : undefined;
    const nft = await getRandomMintedNft({ excludeTokenIds });

    return NextResponse.json({ nft });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch a random NFT."
      },
      { status: 500 }
    );
  }
}
