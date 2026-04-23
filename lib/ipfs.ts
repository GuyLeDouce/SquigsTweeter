const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/"
];

export function normalizeIpfsUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.startsWith("ipfs://ipfs/")) {
    return `${IPFS_GATEWAYS[0]}${value.replace("ipfs://ipfs/", "")}`;
  }

  if (value.startsWith("ipfs://")) {
    return `${IPFS_GATEWAYS[0]}${value.replace("ipfs://", "")}`;
  }

  if (value.startsWith("ar://")) {
    return `https://arweave.net/${value.replace("ar://", "")}`;
  }

  return value;
}

export function fallbackIpfsUrls(value: string | null | undefined) {
  const normalized = normalizeIpfsUrl(value);

  if (!normalized) {
    return [];
  }

  if (!normalized.includes("/ipfs/")) {
    return [normalized];
  }

  const path = normalized.split("/ipfs/")[1];
  return IPFS_GATEWAYS.map((gateway) => `${gateway}${path}`);
}
