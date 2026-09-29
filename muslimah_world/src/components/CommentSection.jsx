import { useState } from "react";
import { useApi } from "../hooks/useApi.js";
import { apiRequest } from "../lib/api.js";
import { getSavedName, saveName } from "../lib/reader.js";

const MAX_NAME = 50;
const MAX_BODY = 2000;

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CommentSection({ chapterId }) {
  const commentsPath = `/api/chapters/${chapterId}/comments`;
  const { status, data: comments, error } = useApi(commentsPath);

  const [name, setName] = useState(getSavedName);
  const [body, setBody] = useState("");
  const [submit, setSubmit] = useState({ status: "idle", message: "" });

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedBody = body.trim();

    if (!trimmedName || !trimmedBody) {
      setSubmit({ status: "error", message: "Please enter your name and a comment." });
      return;
    }

    setSubmit({ status: "sending", message: "" });

    try {
      const result = await apiRequest(commentsPath, {
        method: "POST",
        body: { display_name: trimmedName, body: trimmedBody },
      });
      saveName(trimmedName);
      setBody("");
      setSubmit({ status: "sent", message: result.message });
    } catch (err) {
      setSubmit({ status: "error", message: err.message });
    }
  }

  const inputClass =
    "w-full rounded-md border border-ink/15 bg-white/70 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  return (
    <section aria-labelledby="comments-heading" className="mt-16">
      <h2 id="comments-heading" className="font-serif text-2xl font-semibold">
        Comments{status === "ready" && comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      {status === "loading" && <p className="mt-4 text-ink/60">Loading comments…</p>}
      {status === "error" && <p className="mt-4 text-red-700">{error}</p>}

      {status === "ready" &&
        (comments.length === 0 ? (
          <p className="mt-4 text-ink/60">No comments yet. Be the first to share your thoughts.</p>
        ) : (
          <ul className="mt-6 space-y-6">
            {comments.map((comment) => (
              <li key={comment.id} className="border-b border-ink/10 pb-6">
                <div className="flex items-baseline gap-3">
                  <span className="font-medium">{comment.display_name}</span>
                  <time dateTime={comment.created_at} className="text-xs text-ink/50">
                    {formatDate(comment.created_at)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/85">
                  {comment.body}
                </p>
              </li>
            ))}
          </ul>
        ))}

      <form onSubmit={handleSubmit} className="mt-10 space-y-4 rounded-lg border border-ink/10 bg-white/50 p-5">
        <h3 className="font-serif text-lg font-semibold">Leave a comment</h3>

        <div>
          <label htmlFor="comment-name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="comment-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME}
            autoComplete="nickname"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="comment-body" className="mb-1 block text-sm font-medium">
            Comment
          </label>
          <textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_BODY}
            rows={4}
            className={inputClass}
          />
          <p className="mt-1 text-right text-xs text-ink/50">
            {body.length}/{MAX_BODY}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={submit.status === "sending"}
            className="rounded-md bg-accent px-5 py-2 font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {submit.status === "sending" ? "Sending…" : "Post comment"}
          </button>
          <p className="text-xs text-ink/60">Comments appear after they're approved.</p>
        </div>

        {submit.status === "sent" && (
          <p role="status" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
            {submit.message}
          </p>
        )}
        {submit.status === "error" && (
          <p role="alert" className="text-sm text-red-700">
            {submit.message}
          </p>
        )}
      </form>
    </section>
  );
}