import { useState, useRef } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router";
import StoryCover from "../components/StoryCover.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { useAdminData, useAdminRequest } from "./useAdmin.js";
import {
  dangerButton,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "./ui.js";

const sectionClass = "rounded-lg border border-ink/10 bg-white/60 p-5";

/* ---------- 1. Publishing ---------- */

function PublishPanel({ story, onChanged }) {
  const request = useAdminRequest();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isPublished = story.status === "published";
  const publishedChapters = story.chapters.filter(
    (chapter) => chapter.published,
  ).length;

  async function toggle() {
    if (
      isPublished &&
      !window.confirm(
        "Unpublish this story? Readers will no longer be able to see it or any of its chapters.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      await request(`/api/admin/stories/${story.id}`, {
        method: "PATCH",
        body: { status: isPublished ? "draft" : "published" },
      });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${sectionClass} flex flex-wrap items-center gap-4`}>
      <div className="min-w-60 flex-1">
        <p className="font-medium">
          {isPublished ? "This story is live." : "This story is a draft."}
        </p>
        <p className="text-sm text-ink/60">
          {isPublished
            ? `Readers can see it and its ${publishedChapters} published chapter(s).`
            : "Only you can see it. Publish it to add it to the library."}
        </p>
        {!isPublished && publishedChapters === 0 && (
          <p className="mt-1 text-sm text-amber-700">
            No chapters are published yet, so readers would see an empty story.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      {isPublished && (
        <a
          href={`/stories/${story.slug}`}
          target="_blank"
          rel="noreferrer"
          className={secondaryButton}
        >
          View on site
        </a>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={isPublished ? secondaryButton : primaryButton}
      >
        {busy ? "Saving…" : isPublished ? "Unpublish" : "Publish story"}
      </button>
    </section>
  );
}

/* ---------- Cover ---------- */

const MAX_COVER_SIZE = 5 * 1024 * 1024;

function CoverPanel({ story, onChanged }) {
  const request = useAdminRequest();
  const fileInputRef = useRef(null);
  const [state, setState] = useState({ status: "idle", message: "" });
  const busy = state.status === "uploading" || state.status === "removing";

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_COVER_SIZE) {
      setState({ status: "error", message: "That image is larger than 5 MB." });
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setState({ status: "uploading", message: "" });
    try {
      await request(`/api/admin/stories/${story.id}/cover`, {
        method: "POST",
        body: formData,
      });
      setState({ status: "saved", message: "Cover updated." });
      onChanged();
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  async function removeCover() {
    if (
      !window.confirm(
        "Remove this cover? The story will show its title panel instead.",
      )
    )
      return;

    setState({ status: "removing", message: "" });
    try {
      await request(`/api/admin/stories/${story.id}/cover`, {
        method: "DELETE",
      });
      setState({ status: "saved", message: "Cover removed." });
      onChanged();
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  return (
    <section className={`${sectionClass} space-y-4`}>
      <h2 className="font-serif text-xl font-semibold">Cover</h2>

      <div className="flex flex-wrap items-start gap-6">
        <div className="w-36 shrink-0">
          <StoryCover story={story} className="rounded-md shadow-sm" />
        </div>

        <div className="min-w-60 flex-1 space-y-3">
          <p className="text-sm text-ink/60">
            Choose a photo from your gallery or files: JPG, PNG, WebP or iPhone
            photos, up to 5 MB. It will be cropped to a 3:4 book shape
            automatically.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className={primaryButton}
            >
              {state.status === "uploading"
                ? "Uploading…"
                : story.cover_url
                  ? "Change cover"
                  : "Upload cover"}
            </button>
            {story.cover_url && (
              <button
                type="button"
                onClick={removeCover}
                disabled={busy}
                className={secondaryButton}
              >
                {state.status === "removing" ? "Removing…" : "Remove cover"}
              </button>
            )}
          </div>

          {state.status === "saved" && (
            <p role="status" className="text-sm text-green-800">
              {state.message}
            </p>
          )}
          {state.status === "error" && (
            <p role="alert" className="text-sm text-red-700">
              {state.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- 2. Details ---------- */

function StoryDetailsForm({ story, onSaved }) {
  const request = useAdminRequest();
  const [form, setForm] = useState(() => ({
    title: story.title,
    slug: story.slug,
    blurb: story.blurb ?? "",
  }));
  const [state, setState] = useState({ status: "idle", message: "" });

  function update(field) {
    return (event) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const changes = {};
    const title = form.title.trim();
    const slug = form.slug.trim();
    const blurb = form.blurb.trim() || null;

    if (title !== story.title) changes.title = title;
    if (slug !== story.slug) changes.slug = slug;
    if (blurb !== (story.blurb ?? null)) changes.blurb = blurb;

    if (Object.keys(changes).length === 0) {
      setState({ status: "saved", message: "Nothing has changed." });
      return;
    }

    if (
      changes.slug &&
      story.status === "published" &&
      !window.confirm(
        "Changing the slug changes this story's web address. Old links and bookmarks will stop working. Continue?",
      )
    ) {
      return;
    }

    setState({ status: "saving", message: "" });
    try {
      await request(`/api/admin/stories/${story.id}`, {
        method: "PATCH",
        body: changes,
      });
      setState({ status: "saved", message: "Changes saved." });
      onSaved();
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${sectionClass} space-y-4`}>
      <h2 className="font-serif text-xl font-semibold">Details</h2>

      <div>
        <label htmlFor="story-title" className={labelClass}>
          Title
        </label>
        <input
          id="story-title"
          value={form.title}
          onChange={update("title")}
          maxLength={200}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="story-slug" className={labelClass}>
          Slug (web address)
        </label>
        <input
          id="story-slug"
          value={form.slug}
          onChange={update("slug")}
          maxLength={100}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink/60">
          Readers find this story at /stories/{form.slug || "…"}. Use lowercase
          letters, numbers and hyphens.
        </p>
      </div>

      <div>
        <label htmlFor="story-blurb" className={labelClass}>
          Blurb
        </label>
        <textarea
          id="story-blurb"
          value={form.blurb}
          onChange={update("blurb")}
          
          rows={8}
          className={inputClass}
        />
        <p className="mt-1 text-right text-xs text-ink/50">{form.blurb.length} characters</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state.status === "saving"}
          className={primaryButton}
        >
          {state.status === "saving" ? "Saving…" : "Save details"}
        </button>
        {state.status === "saved" && (
          <p role="status" className="text-sm text-green-800">
            {state.message}
          </p>
        )}
        {state.status === "error" && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
/* ---------- 3. Chapters ---------- */

function ChapterList({ story, onChanged }) {
  const request = useAdminRequest();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function run(chapterId, action) {
    setBusyId(chapterId);
    setError("");
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function togglePublished(chapter) {
    run(chapter.id, () =>
      request(`/api/admin/chapters/${chapter.id}`, {
        method: "PATCH",
        body: { published: !chapter.published },
      }),
    );
  }

  function deleteChapter(chapter) {
    const confirmed = window.confirm(
      `Delete Chapter ${chapter.number}: "${chapter.title}"?\n\nIts comments and reactions will be deleted too. This cannot be undone.`,
    );
    if (!confirmed) return;
    run(chapter.id, () =>
      request(`/api/admin/chapters/${chapter.id}`, { method: "DELETE" }),
    );
  }

  return (
    <section className={`${sectionClass} space-y-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto font-serif text-xl font-semibold">Chapters</h2>
        <Link
          to={`/admin/stories/${story.id}/import`}
          className={secondaryButton}
        >
          Import from file
        </Link>
        <Link
          to={`/admin/stories/${story.id}/chapters/new`}
          className={primaryButton}
        >
          Add chapter
        </Link>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {story.chapters.length === 0 ? (
        <p className="text-ink/60">
          No chapters yet. Add one, or import your Word or PDF file.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-md border border-ink/10">
          {story.chapters.map((chapter) => {
            const busy = busyId === chapter.id;
            return (
              <li
                key={chapter.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <span className="w-20 shrink-0 text-sm text-ink/60">
                  Chapter {chapter.number}
                </span>
                <span className="min-w-40 flex-1 font-serif">
                  {chapter.title}
                </span>
                <StatusBadge
                  status={chapter.published ? "published" : "draft"}
                />

                <div className="flex gap-2">
                  <Link
                    to={`/admin/chapters/${chapter.id}`}
                    className={secondaryButton}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => togglePublished(chapter)}
                    disabled={busyId !== null}
                    className={secondaryButton}
                  >
                    {busy ? "…" : chapter.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteChapter(chapter)}
                    disabled={busyId !== null}
                    className={dangerButton}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- 4. Danger zone ---------- */

function DangerZone({ story }) {
  const request = useAdminRequest();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const typed = window.prompt(
      `This permanently deletes "${story.title}", its ${story.chapters.length} chapter(s), and every comment and reaction on them.\n\nType the story title to confirm:`,
    );
    if (typed === null) return;

    if (typed.trim() !== story.title) {
      setError("The title didn't match, so nothing was deleted.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await request(`/api/admin/stories/${story.id}`, { method: "DELETE" });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-red-200 bg-red-50/40 p-5">
      <h2 className="font-serif text-xl font-semibold text-red-800">
        Danger zone
      </h2>
      <p className="mt-1 text-sm text-ink/70">
        Deleting a story removes it and everything in it. This cannot be undone.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className={`${dangerButton} mt-4`}
      >
        {busy ? "Deleting…" : "Delete this story"}
      </button>
    </section>
  );
}

/* ---------- The page ---------- */

export default function StoryEditorPage() {
  const { id } = useParams();
  const location = useLocation();
  const flashMessage = location.state?.message;
  const {
    status,
    data: story,
    error,
    errorStatus,
    reload,
  } = useAdminData(`/api/admin/stories/${encodeURIComponent(id)}`);

  if (status === "loading") {
    return <p className="text-ink/60">Loading story…</p>;
  }

  if (status === "error") {
    return (
      <div>
        <p className="text-red-700">
          {errorStatus === 404 || errorStatus === 400
            ? "Story not found."
            : error}
        </p>
        <Link to="/admin" className="mt-4 inline-block text-accent underline">
          Back to all stories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <title>{`${story.title} · Admin`}</title>

      <div>
        <Link to="/admin" className="text-sm text-accent hover:underline">
          ← All stories
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-semibold">{story.title}</h1>
          <StatusBadge status={story.status} />
        </div>
      </div>
      {flashMessage && (
        <p
          role="status"
          className="rounded-md bg-green-100 px-4 py-3 text-sm text-green-800"
        >
          {flashMessage}
        </p>
      )}

      <PublishPanel story={story} onChanged={reload} />
      <CoverPanel story={story} onChanged={reload} />
      <StoryDetailsForm key={story.id} story={story} onSaved={reload} />
      <ChapterList story={story} onChanged={reload} />
      <DangerZone story={story} />
    </div>
  );
}
