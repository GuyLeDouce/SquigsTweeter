import { GenerationPayload } from "@/lib/types";
import { getAppConfig } from "@/lib/env";
import { dedupeStrings } from "@/lib/utils";

const CAMPAIGN_GUIDANCE: Record<string, string> = {
  Everyday:
    "Keep it natural and collector-native. Lead with observation, visual charm, or a subtle flex. CTA should feel optional.",
  "Mint Push":
    "Frame the NFT like a live reason to pay attention right now. Hooks can be sharper, urgency can increase slightly, but do not sound like a spam bot.",
  "Community Spotlight":
    "Center the community, culture, and shared obsession. Make the post feel like it belongs in a real collector timeline, not ad copy.",
  "Lore Post":
    "Lean into myth, weirdness, symbolism, and Squigs world-building. The language can be poetic or uncanny as long as it stays readable.",
  "Game/Event Post":
    "Write like this NFT is part of an event, drop, activation, or ongoing moment. The structure should feel timely and action-aware.",
  "Collector Flex":
    "Make the post feel like a tasteful but undeniable flex. The hook should signal rarity, visual punch, or taste without sounding desperate."
};

const LENGTH_GUIDANCE: Record<string, string> = {
  short: "Aim for 110-170 characters.",
  medium: "Aim for 170-240 characters.",
  "punchy-max": "Aim for 220-275 characters while staying sharp."
};

const TONE_GUIDANCE: Record<string, string> = {
  bullish: "Confident, collector-conviction, but no fake guarantees or moonboy clichés.",
  funny: "Dry, weird, internet-native humor. Do not write stand-up setup/punchline boilerplate.",
  lore: "Symbolic, mystical, and referential without becoming unreadable.",
  community: "Warm, in-group, and collective.",
  collector: "Tasteful flex, connoisseur energy, aesthetic confidence.",
  chaotic: "Unhinged in a controlled way. Strange wording is welcome if it still reads well.",
  "shill-lite": "Slightly more promotive, but still human and not spammy."
};

const SQUIGS_CONTEXT = `
Squigs are a 4,444 supply NFT collection from Ugly Labs. They are intergalactic beings who studied humanity's ugly online behavior, opened a portal to Earth, became NFTs in the crossing, and are still watching humans through the chaos of Web3.

Squigs are not just profile pictures or static collectibles. They are a living digital brand built around lore, community participation, games, holder rewards, entertainment utility, and long-term ecosystem expansion.

To Squigs, "Ugly" means more than appearance. It includes greed, chaos, hype cycles, scams, rug pulls, irrational behavior, overconfidence, vanity, abandonment, tribalism, and the weird imperfect behavior humans display online.

Ugly Labs ecosystem notes:
- UglyDex is the collector hub with profile cards, holder identity, trait scores, UglyPoints, badges, rankings, leaderboards, and progression.
- $CHARM is the reward economy for holder rewards, games, incentives, prize loops, and future ecosystem access.
- Holder systems connect wallet ownership to Discord roles, verification, perks, and trait-aware rewards.
- Community systems include UglyBot, The Gauntlet, Squig Survival, InSquignito, lore, memes, events, contests, prize pools, and community-made content.
- Squigs sit beside Charm of the Ugly and Ugly Monsters in a wider Ugly Labs collector ecosystem.

Holder value can include ecosystem membership, games and competitions, reward opportunities, future experiments, community identity, lore participation, cross-project perks, trait-based recognition, contests, and prize events.

Core philosophy:
- "No Roadmap" does not mean no building.
- Build first, talk second.
- Evolve naturally.
- Surprise holders.
- Reward activity.
- Let community shape culture.
- Focus on retention over hype.
- Make ownership fun again.

Voice cues:
- strange cartoon civilization invading Web3
- funny, weird, sharp, self-aware, slightly unhinged
- confident without corporate marketing polish
- useful phrases when natural: Squigs are watching. Portal unstable. Ugly detected. Behaviour logged. Human error confirmed. Collect responsibly. Chaos approved.
`.trim();

export function buildPrompt({ nft, controls, recentExamples }: GenerationPayload) {
  const env = getAppConfig();
  const traits = nft.traits.length
    ? nft.traits.map((trait) => `${trait.trait_type}: ${trait.value}`).join("; ")
    : "No reliable traits available.";

  const recentOpenings = dedupeStrings(
    recentExamples.map((item) => item.mainTweet.split(/[\n.!?]/)[0] ?? "").slice(0, 8)
  );

  const recentCtas = dedupeStrings(
    recentExamples
      .map((item) => item.mainTweet.match(/(discord|site|website|join|visit|drop|mint)/i)?.[0] ?? "")
      .filter(Boolean)
  );

  const ctaInstruction =
    controls.ctaMode === "discord"
      ? "Include a subtle Discord CTA using the provided Discord URL only if it feels natural."
      : controls.ctaMode === "website"
        ? "Include a subtle website CTA using the provided site URL only if it feels natural."
        : "Do not include any call to action or outbound link language.";

  const hashtagInstruction = controls.hashtagEnabled
    ? "Append the configured hashtag only when it feels natural."
    : "Do not include hashtags.";

  const humanizedInstruction = controls.humanized
    ? "Dial down overt promo language. Favor human phrasing, understatement, and collector sincerity."
    : "A bit more promotional energy is acceptable, but avoid spammy cadence.";

  return `
You are writing manual Twitter copy for @SquigsNFT and Ugly Labs.

Brand voice:
- human
- witty
- weird
- collectible
- lore-aware
- web3-native
- not corporate
- not repetitive
- not spammy
- no fake hype
- no roadmap promises
- no generic AI phrasing
- vary sentence openings
- vary syntax and pacing
- use NFT-specific traits only as optional inspiration

NFT data:
- token ID: ${nft.tokenId}
- NFT name: ${nft.name ?? "Unknown"}
- description: ${nft.description ?? "None"}
- traits: ${traits}

Squigs context:
${SQUIGS_CONTEXT}

Subject guidance:
- Do not make every option specifically about this exact NFT.
- Do not mention the token ID, "Squig #${nft.tokenId}", or the NFT name unless it genuinely improves that specific variant.
- Use the selected NFT and traits as context, not a required subject.
- A tweet can be about a trait vibe, Squigs lore, Ugly Labs ecosystem value, games, rewards, holder culture, Web3 behavior, collector psychology, current internet mood, or a simple relatable daily observation.
- At least one of the three tweet variants should avoid direct reference to the selected NFT entirely.
- At most one tweet variant may directly name the selected NFT or token number.
- Avoid explaining the whole collection in every tweet. Let the first reply carry extra context when useful.

Campaign mode:
${controls.campaignMode}: ${CAMPAIGN_GUIDANCE[controls.campaignMode]}

Tone:
${controls.tone}: ${TONE_GUIDANCE[controls.tone]}

Length:
${controls.lengthMode}: ${LENGTH_GUIDANCE[controls.lengthMode]}

Output instructions:
- Write 1 main tweet, 2 alternate tweets, and 1 first reply.
- Every tweet and reply must be under 280 characters.
- Make the three tweet variants feel genuinely different in hook, structure, and rhythm.
- The first reply should support the main tweet, not repeat it.
- ${ctaInstruction}
- ${hashtagInstruction}
- ${humanizedInstruction}
- Use these URLs only when needed:
  - Discord URL: ${env.DEFAULT_DISCORD_URL || "not provided"}
  - Website URL: ${env.DEFAULT_SITE_URL || "not provided"}
  - Hashtag: ${env.DEFAULT_HASHTAG || "#SquigsAreWatching"}

Avoid repetition from recent generations:
- Do not reuse or lightly remix these recent openings:
${recentOpenings.length ? recentOpenings.map((item) => `  - ${item}`).join("\n") : "  - none"}
- Avoid repeating these CTA fragments:
${recentCtas.length ? recentCtas.map((item) => `  - ${item}`).join("\n") : "  - none"}
- Recent campaign contexts:
${recentExamples.length ? recentExamples.map((item) => `  - Token ${item.tokenId}: ${item.campaignMode} / ${item.ctaMode}`).join("\n") : "  - none"}

Return strict JSON with this shape:
{
  "hookStyle": "short description of the distinct approach used",
  "mainTweet": "string",
  "altTweet1": "string",
  "altTweet2": "string",
  "firstReply": "string"
}
`.trim();
}
