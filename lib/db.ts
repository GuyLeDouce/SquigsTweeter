import { prisma } from "@/lib/prisma";
import { GenerationControls, GeneratedContent, NFTRecord } from "@/lib/types";

export async function saveGeneratedTweet({
  nft,
  controls,
  content
}: {
  nft: NFTRecord;
  controls: GenerationControls;
  content: GeneratedContent;
}) {
  if (!prisma) {
    return null;
  }

  return prisma.generatedTweet.create({
    data: {
      tokenId: nft.tokenId,
      nftName: nft.name,
      imageUrl: nft.imageUrl,
      campaignMode: controls.campaignMode,
      tone: controls.tone,
      lengthMode: controls.lengthMode,
      ctaMode: controls.ctaMode,
      hashtagEnabled: controls.hashtagEnabled,
      humanized: controls.humanized,
      mainTweet: content.mainTweet,
      altTweet1: content.altTweet1,
      altTweet2: content.altTweet2,
      firstReply: content.firstReply
    }
  });
}
