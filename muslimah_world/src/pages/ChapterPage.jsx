import { useEffect } from "react";
import { Link, useParams } from "react-router";
import Markdown from "react-markdown";
import ChapterNav from "../components/ChapterNav.jsx";
import { useApi } from "../hooks/useApi.js";
import { saveProgress } from "../lib/progress.js";
import CommentSection from "../components/CommentSection.jsx";
import ReactionBar from "../components/ReactionBar.jsx";

export default function ChapterPage() {
  const { slug, number } = useParams();
  const {
    status,
    data: chapter,
    error,
    errorStatus,
  } = useApi(
    `/api/stories/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(number)}`,
  );

  useEffect(() => {
    if (status === "ready") {
      saveProgress(slug, chapter.number);
    }
  }, [status, slug, chapter]);

  const storyLink = `/stories/${slug}`;
  const chapterLink = (n) => `${storyLink}/chapters/${n}`;

  if (status === "loading") {
    return <p className="text-ink/60">Loading chapter…</p>;
  }

  if (status === "error") {
    const notFound = errorStatus === 404 || errorStatus === 400;
    return (
      <section className="py-16 text-center">
        <h1 className="font-serif text-3xl font-semibold">
          {notFound ? "Chapter not found" : "Something went wrong"}
        </h1>
        {!notFound && <p className="mt-3 text-ink/70">{error}</p>}
        <Link
          to={storyLink}
          className="mt-6 inline-block text-accent underline"
        >
          Back to the story
        </Link>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-2xl">
      <title>{`${chapter.title} · ${chapter.story_title}`}</title>

      <header className="mb-10 text-center">
        <Link to={storyLink} className="text-sm text-accent hover:underline">
          {chapter.story_title}
        </Link>
        <p className="mt-4 text-sm uppercase tracking-widest text-ink/60">
          Chapter {chapter.number}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
          {chapter.title}
        </h1>
      </header>

      <div className="chapter-text">
        <Markdown>{chapter.content}</Markdown>
      </div>

      <ReactionBar key={`reactions-${chapter.id}`} chapterId={chapter.id} />

      <ChapterNav
        prev={chapter.prev}
        next={chapter.next}
        chapterLink={chapterLink}
        storyLink={storyLink}
      />

      <CommentSection key={`comments-${chapter.id}`} chapterId={chapter.id} />
    </article>
  );
}
