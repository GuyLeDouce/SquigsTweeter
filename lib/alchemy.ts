import { getEnv } from "@/lib/env";
import { NFTRecord, TraitItem } from "@/lib/types";
import { fallbackIpfsUrls, normalizeIpfsUrl } from "@/lib/ipfs";

type AlchemyOwnedNft = {
  tokenId: string;
  name?: string;
  title?: string;
  description?: string;
  tokenUri?: string;
  metadataError?: string;
  image?: {
    originalUrl?: string;
    cachedUrl?: string;
    pngUrl?: string;
    thumbnailUrl?: string;
  };
  raw?: {
    tokenUri?: string;
    metadata?: {
      image?: string;
      image_url?: string;
      name?: string;
      description?: string;
      attributes?: Array<{ trait_type?: string; value?: string | number }>;
      traits?: Array<{ trait_type?: string; value?: string | number }>;
    };
  };
  contract?: {
    address?: string;
  };
};

function getAlchemyBaseUrl() {
  const env = getEnv();
  return `https://${env.CHAIN}.g.alchemy.com/nft/v3/${env.ALCHEMY_API_KEY}`;
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {})
    },
    next: {
      revalidate: 0
    }
  });

  if (!response.ok) {
    throw new Error(`Alchemy request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchContractTokenIds(): Promise<string[]> {
  const env = getEnv();
  const tokenIds = new Set<string>();
  let pageKey: string | undefined;

  do {
    const url = new URL(`${getAlchemyBaseUrl()}/getNFTsForContract`);
    url.searchParams.set("contractAddress", env.NFT_CONTRACT_ADDRESS);
    url.searchParams.set("withMetadata", "false");

    if (pageKey) {
      url.searchParams.set("pageKey", pageKey);
    }

    const data = await fetchJson<{ nfts?: Array<{ tokenId: string }>; pageKey?: string }>(url.toString());

    for (const nft of data.nfts ?? []) {
      if (nft.tokenId) {
        tokenIds.add(
          nft.tokenId.startsWith("0x") ? parseInt(nft.tokenId, 16).toString(10) : nft.tokenId
        );
      }
    }

    pageKey = data.pageKey;
  } while (pageKey);

  return [...tokenIds];
}

function parseTraits(nft: AlchemyOwnedNft): TraitItem[] {
  const source = nft.raw?.metadata?.attributes ?? nft.raw?.metadata?.traits ?? [];

  return source
    .map((item) => {
      const trait = item.trait_type?.trim();
      const value =
        typeof item.value === "number" ? item.value.toString() : item.value?.toString().trim();

      if (!trait || !value) {
        return null;
      }

      return {
        trait_type: trait,
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

async function fetchNftByTokenId(tokenId: string): Promise<NFTRecord | null> {
  const env = getEnv();
  const url = `${getAlchemyBaseUrl()}/getNFTMetadata?contractAddress=${env.NFT_CONTRACT_ADDRESS}&tokenId=${tokenId}&refreshCache=false`;
  const nft = await fetchJson<AlchemyOwnedNft>(url);

  const imageCandidate =
    nft.image?.originalUrl ??
    nft.image?.cachedUrl ??
    nft.image?.pngUrl ??
    nft.image?.thumbnailUrl ??
    nft.raw?.metadata?.image ??
    nft.raw?.metadata?.image_url;

  const imageUrl = await validateImage(normalizeIpfsUrl(imageCandidate));

  if (!imageUrl) {
    return null;
  }

  return {
    tokenId,
    name: nft.name ?? nft.title ?? nft.raw?.metadata?.name ?? null,
    imageUrl,
    metadataUrl: normalizeIpfsUrl(nft.tokenUri ?? nft.raw?.tokenUri ?? null),
    description: nft.description ?? nft.raw?.metadata?.description ?? null,
    traits: parseTraits(nft)
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
    const nft = await fetchNftByTokenId(tokenId);

    if (nft) {
      return nft;
    }
  }

  throw new Error("Unable to find a minted NFT with valid metadata and image.");
}

export async function getNftByTokenId(tokenId: string) {
  const nft = await fetchNftByTokenId(tokenId);

  if (!nft) {
    throw new Error(`Unable to load token ${tokenId} with valid metadata and image.`);
  }

  return nft;
}
