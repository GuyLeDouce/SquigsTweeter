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

const PUBLIC_RPC_URLS: Record<string, string[]> = {
  ethereum: [
    "https://ethereum-rpc.publicnode.com",
    "https://cloudflare-eth.com"
  ],
  matic: [
    "https://polygon-rpc.com",
    "https://polygon-bor-rpc.publicnode.com"
  ],
  arbitrum: [
    "https://arbitrum-one-rpc.publicnode.com"
  ],
  optimism: [
    "https://optimism-rpc.publicnode.com"
  ],
  base: [
    "https://base-rpc.publicnode.com"
  ]
};

function getOpenSeaChain(chain: string) {
  return CHAIN_MAP[chain] ?? chain;
}

function getRpcUrls(chain: string) {
  const resolved = getOpenSeaChain(chain);
  return PUBLIC_RPC_URLS[resolved] ?? [];
}

function getMaxTokenId() {
  const env = getEnv();
  return env.MAX_TOKEN_ID ? Number.parseInt(env.MAX_TOKEN_ID, 10) : null;
}

function withinMaxTokenId(tokenId: string) {
  const maxTokenId = getMaxTokenId();

  if (maxTokenId === null) {
    return true;
  }

  const numericTokenId = Number.parseInt(tokenId, 10);
  return Number.isFinite(numericTokenId) && numericTokenId <= maxTokenId;
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

async function fetchRpcJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body),
    next: {
      revalidate: 0
    }
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function padHex(value: bigint) {
  return value.toString(16).padStart(64, "0");
}

function hexToUtf8(hex: string) {
  const bytes = hex.match(/.{1,2}/g) ?? [];
  return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 16))).toString("utf8");
}

function decodeAbiString(result: string) {
  const hex = result.startsWith("0x") ? result.slice(2) : result;

  if (!hex) {
    return null;
  }

  if (hex.length >= 128) {
    const lengthHex = hex.slice(64, 128);
    const length = Number.parseInt(lengthHex, 16);

    if (Number.isFinite(length) && length >= 0) {
      const data = hex.slice(128, 128 + length * 2);
      return hexToUtf8(data).replace(/\0+$/, "");
    }
  }

  return hexToUtf8(hex).replace(/\0+$/, "").trim() || null;
}

async function ethCall(data: string) {
  const env = getEnv();
  const rpcUrls = getRpcUrls(env.CHAIN);
  let lastError: unknown;

  for (const rpcUrl of rpcUrls) {
    try {
      const response = await fetchRpcJson<{
        result?: string;
        error?: { message?: string };
      }>(rpcUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            to: env.NFT_CONTRACT_ADDRESS,
            data
          },
          "latest"
        ]
      });

      if (response.error) {
        throw new Error(response.error.message ?? "Unknown eth_call error");
      }

      if (!response.result) {
        throw new Error("Missing eth_call result");
      }

      return response.result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All public RPC calls failed.");
}

async function getTotalSupplyFromContract() {
  const result = await ethCall("0x18160ddd");
  return Number(BigInt(result));
}

async function getTokenUriFromContract(tokenId: string) {
  const encodedTokenId = padHex(BigInt(tokenId));

  try {
    const result = await ethCall(`0xc87b56dd${encodedTokenId}`);
    return decodeAbiString(result);
  } catch {
    const result = await ethCall(`0x0e89341c${encodedTokenId}`);
    return decodeAbiString(result);
  }
}

function parseMetadataTraits(metadata: Record<string, unknown>) {
  const attributes = Array.isArray(metadata.attributes)
    ? metadata.attributes
    : Array.isArray(metadata.traits)
      ? metadata.traits
      : [];

  return attributes
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const trait = "trait_type" in item ? String(item.trait_type ?? "").trim() : "";
      const value = "value" in item ? String(item.value ?? "").trim() : "";

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

async function fetchMetadataJson(metadataUrl: string) {
  const normalized = normalizeIpfsUrl(metadataUrl);

  if (!normalized) {
    throw new Error("Missing metadata URL");
  }

  if (normalized.startsWith("data:application/json;base64,")) {
    const payload = normalized.replace("data:application/json;base64,", "");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as Record<string, unknown>;
  }

  const candidates = fallbackIpfsUrls(normalized);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        next: {
          revalidate: 0
        }
      });

      if (!response.ok) {
        throw new Error(`Metadata request failed with ${response.status}`);
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to fetch metadata JSON");
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

    const data = await fetchOpenSeaJson<OpenSeaListResponse>(url.pathname + url.search);

    for (const nft of data.nfts ?? []) {
      const tokenId = nft.identifier ?? nft.token_identifier;

      if (tokenId && withinMaxTokenId(tokenId)) {
        tokenIds.add(tokenId);
      }
    }

    cursor = data.next;
  } while (cursor);

  return [...tokenIds];
}

async function fetchContractTokenIdsFallback() {
  const totalSupply = await getTotalSupplyFromContract();
  const maxTokenId = getMaxTokenId();

  if (!Number.isFinite(totalSupply) || totalSupply <= 0) {
    throw new Error("Unable to determine minted supply from contract.");
  }

  const upperBound = maxTokenId === null ? totalSupply : Math.min(totalSupply, maxTokenId);

  if (upperBound < 1) {
    return [];
  }

  return Array.from({ length: upperBound }, (_value, index) => String(index + 1));
}

async function fetchNftByTokenId(tokenId: string): Promise<NFTRecord | null> {
  if (!withinMaxTokenId(tokenId)) {
    throw new Error(`Token ${tokenId} exceeds MAX_TOKEN_ID.`);
  }

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

async function fetchNftByTokenIdFallback(tokenId: string): Promise<NFTRecord | null> {
  if (!withinMaxTokenId(tokenId)) {
    throw new Error(`Token ${tokenId} exceeds MAX_TOKEN_ID.`);
  }

  const tokenUri = await getTokenUriFromContract(tokenId);

  if (!tokenUri) {
    return null;
  }

  const metadata = await fetchMetadataJson(tokenUri);
  const imageCandidate =
    typeof metadata.image === "string"
      ? metadata.image
      : typeof metadata.image_url === "string"
        ? metadata.image_url
        : null;

  const imageUrl = await validateImage(normalizeIpfsUrl(imageCandidate));

  if (!imageUrl) {
    return null;
  }

  return {
    tokenId,
    name: typeof metadata.name === "string" ? metadata.name : null,
    imageUrl,
    metadataUrl: normalizeIpfsUrl(tokenUri),
    description: typeof metadata.description === "string" ? metadata.description : null,
    traits: parseMetadataTraits(metadata)
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
  let tokenIds: string[];

  try {
    tokenIds = await fetchContractTokenIds();
  } catch (error) {
    console.error("OpenSea contract listing failed, falling back to onchain discovery", {
      error: error instanceof Error ? error.message : String(error)
    });
    tokenIds = await fetchContractTokenIdsFallback();
  }

  if (!tokenIds.length) {
    throw new Error("No minted NFTs were discovered for the configured contract.");
  }

  const filtered = options?.excludeTokenIds?.size
    ? tokenIds.filter((tokenId) => !options.excludeTokenIds?.has(tokenId))
    : tokenIds;

  const candidates = shuffle(filtered.length ? filtered : tokenIds);

  for (const tokenId of candidates) {
    try {
      const nft = await fetchNftByTokenId(tokenId).catch(() => fetchNftByTokenIdFallback(tokenId));

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
  const nft = await fetchNftByTokenId(tokenId).catch(() => fetchNftByTokenIdFallback(tokenId));

  if (!nft) {
    throw new Error(`Unable to load token ${tokenId} with valid metadata and image.`);
  }

  return nft;
}
