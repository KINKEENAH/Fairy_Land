import { Link } from "react-router";
import StoryCover from "./StoryCover.jsx";

export default function StoryCard({ story }) {
  return (
    <Link
      to={`/stories/${story.slug}`}
      className="group block overflow-hidden rounded-lg border border-ink/10 bg-white/60 transition hover:shadow-md"
    >
      <StoryCover story={story} />

      <div className="p-4">
        <h2 className="font-serif text-xl font-semibold group-hover:text-accent">
          {story.title}
        </h2>
        {story.blurb && (
          <p className="mt-2 line-clamp-3 text-sm text-ink/70">{story.blurb}</p>
        )}
      </div>
    </Link>
  );
}
