import { Link, useParams } from "react-router";
import StoryCover from "../components/StoryCover.jsx";
import { useApi } from "../hooks/useApi.js";
import { getProgress } from "../lib/progress.js";

export default function StoryPage() {
  const { slug } = useParams();
  const { status, data: story, error, errorStatus } = useApi(
    `/api/stories/${encodeURIComponent(slug)}`
  );

  if (status === "loading") {
    return <p className="text-ink/60">Loading story…</p>;
  }

  if (status === "error") {
    return (
      <section className="py-16 text-center">
        <h1 className="font-serif text-3xl font-semibold">
          {errorStatus === 404 ? "Story not found" : "Something went wrong"}
        </h1>
        {errorStatus !== 404 && <p className="mt-3 text-ink/70">{error}</p>}
        <Link to="/" className="mt-6 inline-block text-accent underline">
          Back to the library
        </Link>
      </section>
    );
  }

  const chapters = story.chapters;
  const firstChapter = chapters[0];
  const lastRead = getProgress(slug);
  const continueChapter = chapters.find((chapter) => chapter.number === lastRead);
  const chapterLink = (number) => `/stories/${slug}/chapters/${number}`;

  return (
    <article>
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <StoryCover story={story} className="rounded-lg shadow-sm" />

        <div>
          <h1 className="font-serif text-4xl font-semibold">{story.title}</h1>

          {story.blurb && (
            <p className="mt-4 whitespace-pre-line leading-relaxed text-ink/80">{story.blurb}</p>
          )}

          <p className="mt-4 text-sm text-ink/60">
            {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
          </p>

          {firstChapter && (
            <div className="mt-6 flex flex-wrap gap-3">
              {continueChapter && continueChapter.number !== firstChapter.number && (
                <Link
                  to={chapterLink(continueChapter.number)}
                  className="rounded-md bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent/90"
                >
                  Continue: Chapter {continueChapter.number}
                </Link>
              )}
              <Link
                to={chapterLink(firstChapter.number)}
                className={
                  continueChapter && continueChapter.number !== firstChapter.number
                    ? "rounded-md border border-accent px-5 py-2.5 font-medium text-accent hover:bg-accent/10"
                    : "rounded-md bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent/90"
                }
              >
                Start from the beginning
              </Link>
            </div>
          )}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold">Chapters</h2>

        {chapters.length === 0 ? (
          <p className="mt-4 text-ink/60">No chapters have been published yet.</p>
        ) : (
          <ol className="mt-4 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white/60">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  to={chapterLink(chapter.number)}
                  className="flex items-baseline gap-4 px-4 py-3 hover:bg-accent/5"
                >
                  <span className="w-24 shrink-0 text-sm text-ink/60">
                    Chapter {chapter.number}
                  </span>
                  <span className="font-serif text-lg">{chapter.title}</span>
                  {chapter.number === lastRead && (
                    <span className="ml-auto shrink-0 text-xs font-medium text-accent">
                      Last read
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}