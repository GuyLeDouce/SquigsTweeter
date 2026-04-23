import { getEnv } from "@/lib/env";
import { fallbackIpfsUrls, normalizeIpfsUrl } from "@/lib/ipfs";
import { NFTRecord, TraitItem } from "@/lib/types";

type OpenSeaListItem = {
  identifier?: string;
  token_identifier?: string;
};

type OpenSeaTrait = {
  trait_type?: string;
  display_type?: string;
  value?: string | number | boolean | null;
};

type OpenSeaMetadataResponse = {
  identifier?: string;
  token_id?: string;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  display_image_url?: string | null;
  image_original_url?: string | null;
  animation_url?: string | null;
  metadata_url?: string | null;
  traits?: OpenSeaTrait[];
};

type OpenSeaListResponse = {
  nfts?: OpenSeaListItem[];
  next?: string | null;
};

const CHAIN_MAP: Record<string, string> = {
  ethereum: "ethereum",
  "eth-mainnet": "ethereum",
  eth: "ethereum",
  polygon: "matic",
  matic: "matic",
  "polygon-mainnet": "matic",
  arbitrum: "arbitrum",
  "arbitrum-mainnet": "arbitrum",
  optimism: "optimism",
  "optimism-mainnet": "optimism",
  base: "base",
  "base-mainnet": "base"
};

function getOpenSeaChain(chain: string) {
  return CHAIN_MAP[chain] ?? chain;
}

function getOpenSeaBaseUrl() {
  return "https://api.opensea.io/api/v2";
}

async function fetchOpenSeaJson<T>(path: string, init?: RequestInit) {
  const env = getEnv();
  const response = await fetch(`${getOpenSeaBaseUrl()}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "x-api-key": env.OPENSEA_API_KEY,
      ...(init?.headers ?? {})
    },
    next: {
      revalidate: 0
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenSea request failed with ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
  }

  return (await response.json()) as T;
}

function parseTraits(traits: OpenSeaTrait[] | undefined): TraitItem[] {
  return (traits ?? [])
    .map((trait) => {
      const traitType = trait.trait_type?.toString().trim();
      const value =
        typeof trait.value === "string"
          ? trait.value.trim()
          : trait.value === null || trait.value === undefined
            ? ""
            : String(trait.value);

      if (!traitType || !value) {
        return null;
      }

      return {
        trait_type: traitType,
        value
      };
    })
    .filter((item): item is TraitItem => Boolean(item));
}

async function validateImage(urlValue: string | null | undefined) {
  const candidates = fallbackIpfsUrls(urlValue);

  for (const candidate of candidates) {
    try {
      let response = await fetch(candidate, {
        method: "HEAD",
        next: {
          revalidate: 0
        }
      });

      if (!response.ok || !(response.headers.get("content-type") ?? "").startsWith("image/")) {
        response = await fetch(candidate, {
          method: "GET",
          next: {
            revalidate: 0
          }
        });
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (response.ok && contentType.startsWith("image/")) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchContractTokenIds(): Promise<string[]> {
  const env = getEnv();
  const chain = getOpenSeaChain(env.CHAIN);
  const tokenIds = new Set<string>();
  let cursor: string | null | undefined;

  do {
    const url = new URL(
      `${getOpenSeaBaseUrl()}/chain/${chain}/contract/${env.NFT_CONTRACT_ADDRESS}/nfts`
    );
    url.searchParams.set("limit", "200");

    if (cursor) {
      url.searchParams.set("next", cursor);
    }

    const data = await fetchOpenSeaJson<OpenSeaListResponse>(
      url.pathname + url.search
    );

    for (const nft of data.nfts ?? []) {
      const tokenId = nft.identifier ?? nft.token_identifier;

      if (tokenId) {
        tokenIds.add(tokenId);
      }
    }

    cursor = data.next;
  } while (cursor);

  return [...tokenIds];
}

async function fetchNftByTokenId(tokenId: string): Promise<NFTRecord | null> {
  const env = getEnv();
  const chain = getOpenSeaChain(env.CHAIN);
  const metadata = await fetchOpenSeaJson<OpenSeaMetadataResponse>(
    `/metadata/${chain}/${env.NFT_CONTRACT_ADDRESS}/${tokenId}`
  );

  const imageCandidate =
    metadata.image_url ??
    metadata.image_original_url ??
    metadata.display_image_url ??
    metadata.animation_url;

  const imageUrl = await validateImage(normalizeIpfsUrl(imageCandidate));

  if (!imageUrl) {
    return null;
  }

  return {
    tokenId: metadata.identifier ?? metadata.token_id ?? tokenId,
    name: metadata.name ?? null,
    imageUrl,
    metadataUrl: normalizeIpfsUrl(metadata.metadata_url ?? null),
    description: metadata.description ?? null,
    traits: parseTraits(metadata.traits)
  };
}

function shuffle<T>(items: T[]) {
  const cloned = [...items];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }

  return cloned;
}

export async function getRandomMintedNft(options?: { excludeTokenIds?: Set<string> }) {
  const tokenIds = await fetchContractTokenIds();

  if (!tokenIds.length) {
    throw new Error("No minted NFTs were discovered for the configured contract.");
  }

  const filtered = options?.excludeTokenIds?.size
    ? tokenIds.filter((tokenId) => !options.excludeTokenIds?.has(tokenId))
    : tokenIds;

  const candidates = shuffle(filtered.length ? filtered : tokenIds);

  for (const tokenId of candidates) {
    try {
      const nft = await fetchNftByTokenId(tokenId);

      if (nft) {
        return nft;
      }
    } catch (error) {
      console.error("OpenSea token fetch failed", {
        tokenId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  throw new Error("Unable to find a minted NFT with valid metadata and image from OpenSea.");
}

export async function getNftByTokenId(tokenId: string) {
  const nft = await fetchNftByTokenId(tokenId);

  if (!nft) {
    throw new Error(`Unable to load token ${tokenId} with valid metadata and image from OpenSea.`);
  }

  return nft;
}
