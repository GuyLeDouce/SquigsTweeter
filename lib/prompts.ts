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
  bullish: "Confident, collector-conviction, and calm. Think 'culture remains' more than 'huge upside'.",
  funny: "Dry, weird, internet-native humor. Observational, not stand-up setup/punchline boilerplate.",
  lore: "Squigs as observers of humanity and Web3. Strange, mysterious, readable.",
  community: "In-group pride, holder recognition, and shared jokes without sounding like a fan club newsletter.",
  collector: "Tasteful flex, connoisseur energy, aesthetic confidence. Sell identity, not price.",
  chaotic: "Slightly unhinged but controlled. Absurd is good if it still feels intentional.",
  "shill-lite": "Soft sell through identity and curiosity. Never desperate, never 'buy now'."
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

const ACCOUNT_STRATEGY = `
@SquigsNFT is not a corporate brand page. It should feel like part media brand, part meme page, part collector club, part lore portal, and part community growth engine.

Primary jobs:
- Grow attention from people who do not own Squigs yet.
- Make holders proud to rep Squigs publicly.
- Make Squigs feel like an active world, not a dormant collection.
- Convert attention gently into Discord joins, site visits, buys, participation, reposts, and retention.
- Build long-term memory: funny, weird, active, different.

The account voice:
- funny, smart, slightly unhinged, confident, self-aware
- internet native, community-first, weird but intentional
- chaotic but controlled
- professional through taste and restraint, not through corporate polish

The account should often speak as if Squigs are documenting human behavior from inside a malfunctioning portal.
`.trim();

const CONTENT_PILLARS = `
Use these content pillars. Pick the one that best fits the campaign/tone, and make the three variants use different pillars when possible:
- Lore: Squigs observing humanity and Web3. Example angle: Humans still buying tops. Incredible species.
- Relatable social: emotions people feel online. Example angle: pretending not to check floor every 12 minutes.
- Holder pride: holders feel early, sharp, and part of the joke. Example angle: Some collect hype. Others collect culture.
- Builder proof: real things shipped, games, rewards, UglyDex, trait scoring, community tools.
- Community highlight: holder memes, art, wins, screenshots, submissions, weird creativity.
- Soft conversion: sell identity, not an item. Example angle: Some people collect JPEGs. Some collect future inside jokes.
- Event/game energy: Squig Survival, The Gauntlet, $CHARM rewards, regret guaranteed.
- Market perspective: attention rotates, culture remains; bear markets expose who kept building.
`.trim();

const POST_FORMATS = `
Use real X-native formats:
- one-line banger
- dry lore observation
- meme caption
- reply-bait question
- soft conversion line
- holder-pride flex
- builder receipt
- thread starter
- quote-tweet style reaction

Preferred cadence:
- short hook first
- no over-explaining
- one clean idea per post
- sharp or funny ending
- understate instead of oversell
`.trim();

const STYLE_EXAMPLES = `
Good Squigs voice examples:
- We regret to inform you the portal is working again.
- Human behaviour remains fascinating.
- Squigs detected another bad decision.
- Supply finite. Chaos infinite.
- We built more stuff while others argued.
- Some collect hype. Others collect culture.
- The weirdest people ended up here.
- Attention rotates. Culture remains.
- Gauntlet starts in 20 minutes. Regret guaranteed.

Bad output to avoid:
- GM family! Huge alpha coming soon!
- Massive utility roadmap soon!
- Don't miss out!!!
- We are building something revolutionary.
- Join our amazing community today.
- This unique NFT showcases the perfect blend of art and utility.
- In the ever-evolving world of Web3...
- Get ready to unlock exclusive benefits.
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

Write like the Squigs X account itself, not like an assistant writing promotional copy.

Non-negotiable voice rules:
- Funny, sharp, professional, and weird.
- Sound alive and culturally aware.
- Make it worth following even for people who do not own the NFTs.
- Sell identity, culture, activity, and curiosity before selling the collection.
- Use NFT-specific traits only as optional inspiration.
- Prefer short concrete phrasing over polished marketing sentences.
- Use fragments when they sound better.
- Leave some mystery. Do not explain every joke.
- No corporate voice, no fake hype, no roadmap promises, no generic AI phrasing.
- No "GM family", "huge alpha", "don't miss out", "revolutionary", "unlock utility", or "ever-evolving Web3" energy.
- Do not sound grateful, thrilled, excited to announce, or proud to present.

NFT data:
- token ID: ${nft.tokenId}
- NFT name: ${nft.name ?? "Unknown"}
- description: ${nft.description ?? "None"}
- traits: ${traits}

Squigs context:
${SQUIGS_CONTEXT}

Account strategy:
${ACCOUNT_STRATEGY}

Content pillars:
${CONTENT_PILLARS}

Post formats:
${POST_FORMATS}

Voice examples:
${STYLE_EXAMPLES}

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
- The three variants should not all be sales posts. Aim for entertainment first unless campaign mode requires otherwise.
- At least one variant should be a one-line banger or dry observation.
- At least one variant should feel funny, absurd, or culturally sharp.
- The first reply should support the main tweet, not repeat it.
- If adding context in the first reply, make it feel like a follow-up from the account, not a brochure.
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
