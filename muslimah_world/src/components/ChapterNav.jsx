import { Link } from "react-router";

const outlineButton =
  "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent";
const solidButton =
  "rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90";

export default function ChapterNav({ prev, next, chapterLink, storyLink }) {
  return (
    <nav
      aria-label="Chapter navigation"
      className="mt-16 grid grid-cols-3 items-center gap-2 border-t border-ink/10 pt-8"
    >
      <div>
        {prev != null && (
          <Link to={chapterLink(prev)} className={outlineButton}>
            ← Previous
          </Link>
        )}
      </div>

      <div className="text-center">
        <Link to={storyLink} className="text-sm text-ink/60 hover:text-accent">
          Contents
        </Link>
      </div>

      <div className="text-right">
        {next != null ? (
          <Link to={chapterLink(next)} className={solidButton}>
            Next →
          </Link>
        ) : (
          <span className="text-sm text-ink/60">You're all caught up</span>
        )}
      </div>
    </nav>
  );
}