import { useState } from "react";
import { useApi } from "../hooks/useApi.js";
import { apiRequest } from "../lib/api.js";
import { REACTIONS } from "../lib/reactions.js";
import { getReaderId } from "../lib/reader.js";

export default function ReactionBar({ chapterId }) {
  const readerId = getReaderId();
  const reactionsPath = `/api/chapters/${chapterId}/reactions`;

  const { status, data } = useApi(
    `${reactionsPath}?reader_id=${encodeURIComponent(readerId)}`
  );
  const [updated, setUpdated] = useState(null);
  const [pendingType, setPendingType] = useState(null);
  const [error, setError] = useState("");

  const summary = updated ?? data;

  if (status === "loading") {
    return <div className="mt-12 h-11" aria-hidden="true" />;
  }
  if (status === "error" || !summary) {
    return null;
  }

  async function toggle(type) {
    if (pendingType) return;

    const alreadyReacted = summary.mine.includes(type);
    setPendingType(type);
    setError("");

    try {
      const result = alreadyReacted
        ? await apiRequest(
            `${reactionsPath}/${type}?reader_id=${encodeURIComponent(readerId)}`,
            { method: "DELETE" }
          )
        : await apiRequest(reactionsPath, {
            method: "POST",
            body: { reader_id: readerId, type },
          });
      setUpdated(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingType(null);
    }
  }

  return (
    <section aria-label="Reactions" className="mt-12">
      <p className="mb-3 text-center text-sm text-ink/60">How did this chapter make you feel?</p>

      <div className="flex flex-wrap justify-center gap-2">
        {REACTIONS.map(({ type, emoji, label }) => {
          const active = summary.mine.includes(type);
          const count = summary.counts[type] ?? 0;

          return (
            <button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              disabled={pendingType !== null}
              aria-pressed={active}
              title={label}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-ink/15 hover:border-accent/50"
              }`}
            >
              <span className="text-lg leading-none">{emoji}</span>
              <span className="tabular-nums">{count}</span>
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-center text-sm text-red-700">{error}</p>}
    </section>
  );
}