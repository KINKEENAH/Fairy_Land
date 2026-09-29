import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Link, useBlocker, useLocation, useNavigate, useParams } from "react-router";
import { useAdminData, useAdminRequest } from "./useAdmin.js";
import { inputClass, labelClass, primaryButton, secondaryButton } from "./ui.js";
import { countWords } from "../lib/text.js";
/* ---------- Helpers ---------- */

function toFormValues(values) {
  return {
    number: values.number == null ? "" : String(values.number),
    title: values.title ?? "",
    content: values.content ?? "",
    published: Boolean(values.published),
  };
}

function sameValues(a, b) {
  return (
    a.number === b.number &&
    a.title === b.title &&
    a.content === b.content &&
    a.published === b.published
  );
}



function useUnsavedChangesWarning(isDirty, allowNavigationRef) {
  // Leaving via a link inside the app
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !allowNavigationRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("You have unsaved changes. Leave this page and lose them?")) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  // Closing the tab, refreshing, or typing a new address
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

/* ---------- The form (used for both new and edit) ---------- */

function ChapterForm({ mode, storyId, chapterId, initial, initialMessage = "" }) {
  const request = useAdminRequest();
  const navigate = useNavigate();
  const allowNavigationRef = useRef(false);

  const [form, setForm] = useState(() => toFormValues(initial));
  const [saved, setSaved] = useState(() => toFormValues(initial));
  const [tab, setTab] = useState("write");
  const [state, setState] = useState({
    status: initialMessage ? "saved" : "idle",
    message: initialMessage,
  });

  const isDirty = !sameValues(form, saved);
  useUnsavedChangesWarning(isDirty, allowNavigationRef);

  function update(field) {
    return (event) => {
      const value = field === "published" ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const number = Number(form.number);
    const title = form.title.trim();
    const content = form.content.trim();

    if (!Number.isInteger(number) || number < 1) {
      setState({ status: "error", message: "Chapter number must be a whole number, 1 or higher." });
      return;
    }
    if (!title) {
      setState({ status: "error", message: "Please enter a title." });
      return;
    }
    if (!content) {
      setState({ status: "error", message: "The chapter has no text yet." });
      return;
    }

    setState({ status: "saving", message: "" });

    try {
      if (mode === "new") {
        const created = await request("/api/admin/chapters", {
          method: "POST",
          body: { story_id: Number(storyId), number, title, content, published: form.published },
        });
        allowNavigationRef.current = true;
        navigate(`/admin/chapters/${created.id}`, {
          replace: true,
          state: { justCreated: true },
        });
        return;
      }

      const changes = {};
      if (number !== Number(saved.number)) changes.number = number;
      if (title !== saved.title) changes.title = title;
      if (content !== saved.content) changes.content = content;
      if (form.published !== saved.published) changes.published = form.published;

      if (Object.keys(changes).length > 0) {
        await request(`/api/admin/chapters/${chapterId}`, { method: "PATCH", body: changes });
      }

      const cleaned = toFormValues({ number, title, content, published: form.published });
      setForm(cleaned);
      setSaved(cleaned);
      setState({ status: "saved", message: "Saved." });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  const tabClass = (name) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      tab === name ? "bg-accent/10 text-accent" : "text-ink/60 hover:text-accent"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Link to={`/admin/stories/${storyId}`} className="text-sm text-accent hover:underline">
          ← Back to story
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-semibold">
          {mode === "new" ? "New chapter" : `Chapter ${saved.number}: ${saved.title}`}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
        <div>
          <label htmlFor="chapter-number" className={labelClass}>Number</label>
          <input
            id="chapter-number"
            type="number"
            min={1}
            step={1}
            value={form.number}
            onChange={update("number")}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="chapter-title" className={labelClass}>Title</label>
          <input
            id="chapter-title"
            value={form.title}
            onChange={update("title")}
            maxLength={200}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setTab("write")} aria-pressed={tab === "write"} className={tabClass("write")}>
            Write
          </button>
          <button type="button" onClick={() => setTab("preview")} aria-pressed={tab === "preview"} className={tabClass("preview")}>
            Preview
          </button>
          <span className="ml-auto text-xs text-ink/60 tabular-nums">
            {countWords(form.content).toLocaleString()} words
          </span>
        </div>

        {tab === "write" ? (
          <>
            <label htmlFor="chapter-content" className="sr-only">Chapter text</label>
            <textarea
              id="chapter-content"
              value={form.content}
              onChange={update("content")}
              rows={24}
              className={`${inputClass} font-serif leading-relaxed`}
            />
            <p className="mt-1 text-xs text-ink/60">
              Leave a blank line between paragraphs. *Italics* for thoughts, **bold** for emphasis,
              and *** on its own line for a scene break.
            </p>
          </>
        ) : (
          <div className="min-h-96 rounded-md border border-ink/10 bg-white/70 px-6 py-4">
            {form.content.trim() ? (
              <div className="chapter-text mx-auto max-w-2xl">
                <Markdown>{form.content}</Markdown>
              </div>
            ) : (
              <p className="text-ink/60">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink/10 pt-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={update("published")} className="size-4 accent-accent" />
          Published (visible to readers)
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-4">
          {isDirty && state.status !== "saving" && (
            <span className="text-sm text-amber-700">Unsaved changes</span>
          )}
          {state.status === "saved" && !isDirty && (
            <span role="status" className="text-sm text-green-800">{state.message}</span>
          )}
          {state.status === "error" && (
            <span role="alert" className="text-sm text-red-700">{state.message}</span>
          )}
          <Link to={`/admin/stories/${storyId}`} className={secondaryButton}>
            {mode === "new" ? "Cancel" : "Done"}
          </Link>
          <button type="submit" disabled={state.status === "saving"} className={primaryButton}>
            {state.status === "saving" ? "Saving…" : mode === "new" ? "Create chapter" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ---------- The two pages ---------- */

export function NewChapterPage() {
  const { storyId } = useParams();
  const { status, data: story, error } = useAdminData(
    `/api/admin/stories/${encodeURIComponent(storyId)}`
  );

  if (status === "loading") return <p className="text-ink/60">Loading…</p>;
  if (status === "error") return <p className="text-red-700">{error}</p>;

  const nextNumber = story.chapters.reduce((max, chapter) => Math.max(max, chapter.number), 0) + 1;

  return (
    <>
      <title>{`New chapter · ${story.title} · Admin`}</title>
      <ChapterForm
        mode="new"
        storyId={story.id}
        initial={{ number: nextNumber, title: "", content: "", published: false }}
      />
    </>
  );
}

export function EditChapterPage() {
  const { id } = useParams();
  const location = useLocation();
  const { status, data: chapter, error, errorStatus } = useAdminData(
    `/api/admin/chapters/${encodeURIComponent(id)}`
  );

  if (status === "loading") return <p className="text-ink/60">Loading chapter…</p>;

  if (status === "error") {
    return (
      <div>
        <p className="text-red-700">
          {errorStatus === 404 || errorStatus === 400 ? "Chapter not found." : error}
        </p>
        <Link to="/admin" className="mt-4 inline-block text-accent underline">
          Back to all stories
        </Link>
      </div>
    );
  }

  return (
    <>
      <title>{`Chapter ${chapter.number} · Admin`}</title>
      <ChapterForm
        key={chapter.id}
        mode="edit"
        storyId={chapter.story_id}
        chapterId={chapter.id}
        initial={chapter}
        initialMessage={location.state?.justCreated ? "Chapter created." : ""}
      />
    </>
  );
}