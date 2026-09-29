import { useState } from "react";
import { useOutletContext, useSearchParams } from "react-router";
import { useAdminData, useAdminRequest } from "./useAdmin.js";
import { dangerButton, primaryButton, secondaryButton } from "./ui.js";

const FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All" },
];

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/* ---------- The list of comments, with its actions ---------- */

function CommentList({ comments, onChanged }) {
  const request = useAdminRequest();
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const selectable = comments.filter((comment) => !comment.approved);
  const selectedIds = selectable
    .filter((comment) => selected.has(comment.id))
    .map((comment) => comment.id);
  const allSelected = selectable.length > 0 && selectedIds.length === selectable.length;

  function toggleSelected(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((comment) => comment.id)));
  }

  async function run(busyKey, action) {
    setBusy(busyKey);
    setError("");
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  function setApproved(comment, approved) {
    run(comment.id, () =>
      request(`/api/admin/comments/${comment.id}`, { method: "PATCH", body: { approved } })
    );
  }

  function remove(comment) {
    if (!window.confirm(`Delete this comment by ${comment.display_name}? This cannot be undone.`)) {
      return;
    }
    run(comment.id, () => request(`/api/admin/comments/${comment.id}`, { method: "DELETE" }));
  }

  function approveSelected() {
    run("bulk", async () => {
      await request("/api/admin/comments/approve", {
        method: "POST",
        body: { ids: selectedIds },
      });
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-4">
      {selectable.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-ink/10 bg-white/60 px-4 py-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 accent-accent"
            />
            Select all pending on this page
          </label>
          <button
            type="button"
            onClick={approveSelected}
            disabled={selectedIds.length === 0 || busy !== null}
            className={`${primaryButton} ml-auto`}
          >
            {busy === "bulk" ? "Approving…" : `Approve selected (${selectedIds.length})`}
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white/60">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3 px-4 py-4">
            {!comment.approved ? (
              <input
                type="checkbox"
                checked={selected.has(comment.id)}
                onChange={() => toggleSelected(comment.id)}
                aria-label={`Select comment by ${comment.display_name}`}
                className="mt-1 size-4 shrink-0 accent-accent"
              />
            ) : (
              <span className="w-4 shrink-0" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{comment.display_name}</span>
                <span className="text-ink/50">{formatDateTime(comment.created_at)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    comment.approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {comment.approved ? "Approved" : "Pending"}
                </span>
              </div>

              <p className="mt-1 text-xs text-ink/60">
                on {comment.story_title} · Chapter {comment.chapter_number}: {comment.chapter_title}
              </p>

              <p className="mt-2 whitespace-pre-line break-words leading-relaxed">{comment.body}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {comment.approved ? (
                  <button
                    type="button"
                    onClick={() => setApproved(comment, false)}
                    disabled={busy !== null}
                    className={secondaryButton}
                  >
                    {busy === comment.id ? "…" : "Hide"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setApproved(comment, true)}
                    disabled={busy !== null}
                    className={primaryButton}
                  >
                    {busy === comment.id ? "…" : "Approve"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(comment)}
                  disabled={busy !== null}
                  className={dangerButton}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- The page ---------- */

export default function CommentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshPendingCount } = useOutletContext();

  const requestedFilter = searchParams.get("status");
  const filter = FILTERS.some((f) => f.value === requestedFilter) ? requestedFilter : "pending";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const { status, data, error, reload } = useAdminData(
    `/api/admin/comments?status=${filter}&page=${page}`
  );

  function afterChange() {
    reload();
    refreshPendingCount();
  }

  const filterClass = (value) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      filter === value ? "bg-accent/10 text-accent" : "text-ink/60 hover:text-accent"
    }`;

  return (
    <div className="space-y-6">
      <title>Comments · Admin</title>
      <h1 className="font-serif text-3xl font-semibold">Comments</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSearchParams({ status: value })}
            aria-pressed={filter === value}
            className={filterClass(value)}
          >
            {label}
            {value === "pending" && data?.pendingCount > 0 && ` (${data.pendingCount})`}
          </button>
        ))}
      </div>

      {status === "loading" && <p className="text-ink/60">Loading comments…</p>}
      {status === "error" && <p className="text-red-700">{error}</p>}

      {status === "ready" &&
        (data.comments.length === 0 ? (
          <p className="text-ink/60">
            {filter === "pending" && page === 1
              ? "No comments are waiting for approval."
              : "No comments to show here."}
          </p>
        ) : (
          <CommentList
            key={`${filter}-${page}`}
            comments={data.comments}
            onChanged={afterChange}
          />
        ))}

      {status === "ready" && (page > 1 || data.hasMore) && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSearchParams({ status: filter, page: String(page - 1) })}
            disabled={page === 1}
            className={secondaryButton}
          >
            ← Previous
          </button>
          <span className="text-sm text-ink/60">Page {page}</span>
          <button
            type="button"
            onClick={() => setSearchParams({ status: filter, page: String(page + 1) })}
            disabled={!data.hasMore}
            className={secondaryButton}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}