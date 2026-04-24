"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateTime, getCtaLabel } from "@/lib/utils";

type HistoryItem = {
  id: string;
  tokenId: string;
  nftName: string | null;
  imageUrl: string;
  campaignMode: string;
  tone: string;
  ctaMode: string;
  mainTweet: string;
  createdAt: string;
  favorite: boolean;
};

export function HistoryList() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/history");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load history.");
      }

      setItems(data.items);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const patchItem = async (id: string, body: { favorite?: boolean; discarded?: boolean }) => {
    const response = await fetch(`/api/history/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to update history item.");
    }

    return data.item as HistoryItem;
  };

  const toggleFavorite = async (item: HistoryItem) => {
    try {
      const updated = await patchItem(item.id, { favorite: !item.favorite });
      setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      setFeedback(updated.favorite ? "Marked as favorite." : "Removed from favorites.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update favorite.");
    }
  };

  const discard = async (item: HistoryItem) => {
    try {
      const response = await fetch(`/api/history/${item.id}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to discard item.");
      }

      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setFeedback(`Removed token #${item.tokenId} from active history.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to discard item.");
    }
  };

  const copyAgain = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setFeedback("Main tweet copied.");
  };

  return (
    <div className="shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Stored Generations</p>
          <h1 className="headline">History</h1>
          <p className="subhead">
            Review previous outputs, re-copy copy, star the good ones, and clear the misses.
          </p>
        </div>

        <div className="nav-links">
          <Link className="nav-chip" href="/">
            Generator
          </Link>
        </div>
      </header>

      {feedback ? <div className="feedback">{feedback}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {loading ? (
        <div className="card loading-shell">Loading history...</div>
      ) : items.length ? (
        <div className="history-grid">
          {items.map((item) => (
            <article className="card history-card" key={item.id}>
              <div className="history-thumb">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.nftName ?? `Token ${item.tokenId}`}
                  />
                ) : (
                  <div className="image-placeholder">
                    No image saved for this token.
                  </div>
                )}
              </div>

              <div>
                <div className="history-meta">
                  <span className="pill">Token #{item.tokenId}</span>
                  <span className="pill">{item.nftName ?? "Unnamed Squig"}</span>
                  <span className="pill">{item.campaignMode}</span>
                  <span className="pill">{item.tone}</span>
                  <span className="pill">{getCtaLabel(item.ctaMode)}</span>
                  <span className="pill">{formatDateTime(item.createdAt)}</span>
                </div>

                <p>{item.mainTweet}</p>

                <div className="history-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyAgain(item.mainTweet)}
                  >
                    Copy Again
                  </button>
                  <button
                    type="button"
                    className="secondary-button star-button"
                    onClick={() => void toggleFavorite(item)}
                  >
                    {item.favorite ? "Starred" : "Favorite"}
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void discard(item)}
                  >
                    Discard
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          No generations saved yet. Head back to the generator and create the first one.
        </div>
      )}
    </div>
  );
}
