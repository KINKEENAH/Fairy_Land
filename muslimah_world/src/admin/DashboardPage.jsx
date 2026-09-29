import { useState } from "react";
import { Link } from "react-router";
import { useAdminData, useAdminRequest } from "./useAdmin.js";
import { inputClass, labelClass, primaryButton } from "./ui.js";
import StatusBadge from "./StatusBadge.jsx";


function NewStoryForm({ onCreated }) {
  const request = useAdminRequest();
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim()) {
      setState({ status: "error", message: "Please enter a title." });
      return;
    }

    setState({ status: "saving", message: "" });
    try {
      const story = await request("/api/admin/stories", {
        method: "POST",
        body: { title: title.trim(), blurb: blurb.trim() || null },
      });
      setTitle("");
      setBlurb("");
      setState({ status: "saved", message: `"${story.title}" was created as a draft.` });
      onCreated();
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-ink/10 bg-white/60 p-5"
    >
      <h2 className="font-serif text-xl font-semibold">New story</h2>

      <div>
        <label htmlFor="new-title" className={labelClass}>
          Title
        </label>
        <input
          id="new-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="new-blurb" className={labelClass}>
          Blurb <span className="font-normal text-ink/50">(optional)</span>
        </label>
        <textarea
          id="new-blurb"
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          maxLength={1000}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={state.status === "saving"} className={primaryButton}>
          {state.status === "saving" ? "Creating…" : "Create story"}
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

export default function DashboardPage() {
  const { status, data: stories, error, reload } = useAdminData("/api/admin/stories");

  return (
    <div className="space-y-10">
      <title>Stories · Admin</title>

      <section>
        <h1 className="mb-4 font-serif text-3xl font-semibold">Stories</h1>

        {status === "loading" && <p className="text-ink/60">Loading…</p>}
        {status === "error" && <p className="text-red-700">{error}</p>}

        {status === "ready" &&
          (stories.length === 0 ? (
            <p className="text-ink/60">No stories yet. Create your first one below.</p>
          ) : (
            <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white/60">
              {stories.map((story) => (
                <li key={story.id}>
                  <Link
                    to={`/admin/stories/${story.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-accent/5"
                  >
                    <span className="font-serif text-lg">{story.title}</span>
                    <StatusBadge status={story.status} />
                    <span className="ml-auto text-sm text-ink/60">
                      {story.published_count} of {story.chapter_count} chapters published
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </section>

      <NewStoryForm onCreated={reload} />
    </div>
  );
}