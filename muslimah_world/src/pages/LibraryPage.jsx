import StoryCard from "../components/StoryCard.jsx";
import { useApi } from "../hooks/useApi.js";

export default function LibraryPage() {
  const { status, data: stories, error } = useApi("/api/stories");

  if (status === "loading") {
    return <p className="text-ink/60">Loading stories…</p>;
  }
  if (status === "error") {
    return <p className="text-red-700">{error}</p>;
  }

  return (
    <section>
      <h1 className="mb-6 font-serif text-3xl font-semibold">Library</h1>

      {stories.length === 0 ? (
        <p className="text-ink/60">No stories have been published yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </section>
  );
}