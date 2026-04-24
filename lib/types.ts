export type ToneMode =
  | "bullish"
  | "funny"
  | "lore"
  | "community"
  | "collector"
  | "chaotic"
  | "shill-lite";

export type LengthMode = "short" | "medium" | "punchy-max";

export type CtaMode = "discord" | "website" | "none";

export type CampaignMode =
  | "Everyday"
  | "Mint Push"
  | "Community Spotlight"
  | "Lore Post"
  | "Game/Event Post"
  | "Collector Flex";

export type TraitItem = {
  trait_type: string;
  value: string;
};

export type NFTRecord = {
  tokenId: string;
  name: string | null;
  imageUrl: string | null;
  metadataUrl: string | null;
  description: string | null;
  traits: TraitItem[];
};

export type GenerationControls = {
  tone: ToneMode;
  hashtagEnabled: boolean;
  ctaMode: CtaMode;
  lengthMode: LengthMode;
  excludeRecent: boolean;
  humanized: boolean;
  campaignMode: CampaignMode;
};

export type GenerationPayload = {
  nft: NFTRecord;
  controls: GenerationControls;
  recentExamples: {
    tokenId: string;
    mainTweet: string;
    ctaMode: string;
    campaignMode: string;
  }[];
};

export type GeneratedContent = {
  mainTweet: string;
  altTweet1: string;
  altTweet2: string;
  firstReply: string;
  hookStyle: string;
};
