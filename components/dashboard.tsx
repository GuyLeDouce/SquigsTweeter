"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  CampaignMode,
  CtaMode,
  GenerationControls,
  LengthMode,
  NFTRecord,
  ToneMode
} from "@/lib/types";

type ResultState = {
  nft: NFTRecord;
  content: {
    mainTweet: string;
    altTweet1: string;
    altTweet2: string;
    firstReply: string;
    hookStyle: string;
  };
  recordId: string;
};

const TONES: ToneMode[] = [
  "bullish",
  "funny",
  "lore",
  "community",
  "collector",
  "chaotic",
  "shill-lite"
];

const CAMPAIGN_MODES: CampaignMode[] = [
  "Everyday",
  "Mint Push",
  "Community Spotlight",
  "Lore Post",
  "Game/Event Post",
  "Collector Flex"
];

const LENGTHS: LengthMode[] = ["short", "medium", "punchy-max"];
const CTAS: Array<{ label: string; value: CtaMode }> = [
  { label: "Discord", value: "discord" },
  { label: "Website", value: "website" },
  { label: "None", value: "none" }
];

const defaultControls: GenerationControls = {
  tone: "collector",
  hashtagEnabled: true,
  ctaMode: "none",
  lengthMode: "medium",
  excludeRecent: true,
  humanized: true,
  campaignMode: "Everyday"
};

function ControlButton({
  active,
  disabled,
  onClick,
  children
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function Dashboard() {
  const [controls, setControls] = useState<GenerationControls>(defaultControls);
  const [selectedNft, setSelectedNft] = useState<NFTRecord | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Generating...");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canGenerateSame = Boolean(selectedNft?.tokenId);
  const traitSummary = selectedNft?.traits ?? [];

  const updateControls = <K extends keyof GenerationControls>(
    key: K,
    value: GenerationControls[K]
  ) => {
    setControls((current) => ({
      ...current,
      [key]: value
    }));
  };

  const fetchRandomNft = async () => {
    const response = await fetch(`/api/nft/random?excludeRecent=${controls.excludeRecent}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to fetch NFT.");
    }

    return data.nft as NFTRecord;
  };

  const runGeneration = async (mode: "new" | "same" | "load-only") => {
    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      let nft = selectedNft;

      if (mode === "new" || !nft) {
        setLoadingLabel("Finding a minted Squig...");
        nft = await fetchRandomNft();
        setSelectedNft(nft);
      }

      if (mode === "load-only") {
        setResult(null);
        return;
      }

      if (!nft) {
        throw new Error("No NFT selected.");
      }

      setLoadingLabel("Writing tweet variants...");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          tokenId: nft.tokenId,
          controls
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to generate tweet.");
      }

      setSelectedNft(data.nft);
      setResult({
        nft: data.nft,
        content: data.content,
        recordId: data.record?.id ?? ""
      });
      setFeedback(
        data.record?.id
          ? "Fresh copy generated."
          : "Fresh copy generated. History storage is unavailable."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setLoadingLabel("Generating...");
    }
  };

  const downloadImage = async () => {
    if (!selectedNft) {
      return;
    }

    const link = document.createElement("a");
    link.href = `/api/image?url=${encodeURIComponent(selectedNft.imageUrl)}&filename=${encodeURIComponent(`squig-${selectedNft.tokenId}.png`)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setFeedback(`Image downloaded for token #${selectedNft.tokenId}.`);
  };

  const copyWithFeedback = async (value: string, label: string) => {
    await copyText(value);
    setFeedback(`${label} copied.`);
  };

  return (
    <div className="shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Manual WebApp for @SquigsNFT</p>
          <h1 className="headline">Squigs Tweet Generator</h1>
          <p className="subhead">
            Pull a random minted NFT, turn its metadata into collector-native copy, and keep
            repetition low with database-backed history and token usage tracking.
          </p>
        </div>

        <div className="nav-links">
          <Link className="nav-chip" href="/history">
            History
          </Link>
        </div>
      </header>

      <div className="grid">
        <aside className="panel">
          <h2>Controls</h2>

          <div className="control-group">
            <label htmlFor="campaign-mode">Campaign Mode</label>
            <select
              id="campaign-mode"
              className="select"
              disabled={loading}
              value={controls.campaignMode}
              onChange={(event) =>
                updateControls("campaignMode", event.target.value as CampaignMode)
              }
            >
              {CAMPAIGN_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="tone-mode">Tone</label>
            <select
              id="tone-mode"
              className="select"
              disabled={loading}
              value={controls.tone}
              onChange={(event) => updateControls("tone", event.target.value as ToneMode)}
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <span className="toggle-label">CTA</span>
            <div className="segmented">
              {CTAS.map((cta) => (
                <ControlButton
                  key={cta.value}
                  active={controls.ctaMode === cta.value}
                  disabled={loading}
                  onClick={() => updateControls("ctaMode", cta.value)}
                >
                  {cta.label}
                </ControlButton>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="toggle-label">Length</span>
            <div className="segmented">
              {LENGTHS.map((length) => (
                <ControlButton
                  key={length}
                  active={controls.lengthMode === length}
                  disabled={loading}
                  onClick={() => updateControls("lengthMode", length)}
                >
                  {length}
                </ControlButton>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label className="toggle">
              <span>Hashtag: #SquigsAreWatching</span>
              <input
                type="checkbox"
                checked={controls.hashtagEnabled}
                disabled={loading}
                onChange={(event) => updateControls("hashtagEnabled", event.target.checked)}
              />
            </label>
          </div>

          <div className="control-group">
            <label className="toggle">
              <span>Exclude recently used NFTs</span>
              <input
                type="checkbox"
                checked={controls.excludeRecent}
                disabled={loading}
                onChange={(event) => updateControls("excludeRecent", event.target.checked)}
              />
            </label>
          </div>

          <div className="control-group">
            <label className="toggle">
              <span>Less salesy, more human</span>
              <input
                type="checkbox"
                checked={controls.humanized}
                disabled={loading}
                onChange={(event) => updateControls("humanized", event.target.checked)}
              />
            </label>
          </div>

          <div className="action-row">
            <button
              type="button"
              className="primary-button"
              disabled={loading}
              onClick={() => runGeneration("new")}
            >
              Generate
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={loading}
              onClick={() => runGeneration("new")}
            >
              Generate New NFT
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={loading || !canGenerateSame}
              onClick={() => runGeneration("same")}
            >
              Regenerate Same NFT
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={loading}
              onClick={() => runGeneration("load-only")}
            >
              Load New NFT
            </button>
          </div>

          <div className="feedback">{feedback}</div>
        </aside>

        <section className="results">
          {error ? <div className="error-box">{error}</div> : null}

          <article className="card hero-card">
            {selectedNft ? (
              <div className="hero-layout">
                <div className="image-wrap">
                  <img
                    src={selectedNft.imageUrl}
                    alt={selectedNft.name ?? `Squig ${selectedNft.tokenId}`}
                  />
                </div>

                <div className="hero-content">
                  <div className="token-line">
                    <span className="pill">Token #{selectedNft.tokenId}</span>
                    <span className="pill">{controls.campaignMode}</span>
                    <span className="pill">{controls.tone}</span>
                    {traitSummary.length ? <span className="badge">Trait influence active</span> : null}
                  </div>

                  <h2 className="section-title">{selectedNft.name ?? "Unnamed Squig"}</h2>
                  <p className="subhead">
                    {selectedNft.description ??
                      "Metadata is sparse for this token, so the generator leans on token identity and available traits."}
                  </p>

                  <div className="trait-grid">
                    {traitSummary.length ? (
                      traitSummary.map((trait) => (
                        <span
                          key={`${trait.trait_type}-${trait.value}`}
                          className="pill"
                        >
                          {trait.trait_type}: {trait.value}
                        </span>
                      ))
                    ) : (
                      <span className="pill">No reliable traits found</span>
                    )}
                  </div>

                  <div className="history-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={loading}
                      onClick={downloadImage}
                    >
                      Download Image
                    </button>
                    {result?.recordId ? (
                      <Link className="nav-chip" href="/history">
                        View in History
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="image-placeholder">
                {loading ? loadingLabel : "Generate to pull a random minted NFT and start writing."}
              </div>
            )}
          </article>

          {loading ? (
            <div className="card loading-shell">{loadingLabel}</div>
          ) : null}

          {result ? (
            <div className="tweet-grid">
              <article className="card tweet-card full">
                <h3>Main Tweet</h3>
                <p>{result.content.mainTweet}</p>
                <div className="card-actions">
                  <span className="ghost-note">{result.content.hookStyle}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyWithFeedback(result.content.mainTweet, "Main tweet")}
                  >
                    Copy
                  </button>
                </div>
              </article>

              <article className="card tweet-card">
                <h3>Alternate Tweet 1</h3>
                <p>{result.content.altTweet1}</p>
                <div className="card-actions">
                  <span className="ghost-note">{result.content.altTweet1.length}/280</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyWithFeedback(result.content.altTweet1, "Alternate tweet 1")}
                  >
                    Copy
                  </button>
                </div>
              </article>

              <article className="card tweet-card">
                <h3>Alternate Tweet 2</h3>
                <p>{result.content.altTweet2}</p>
                <div className="card-actions">
                  <span className="ghost-note">{result.content.altTweet2.length}/280</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyWithFeedback(result.content.altTweet2, "Alternate tweet 2")}
                  >
                    Copy
                  </button>
                </div>
              </article>

              <article className="card tweet-card full">
                <h3>First Reply</h3>
                <p>{result.content.firstReply}</p>
                <div className="card-actions">
                  <span className="ghost-note">{result.content.firstReply.length}/280</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyWithFeedback(result.content.firstReply, "First reply")}
                  >
                    Copy
                  </button>
                </div>
              </article>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
