export default function StoryCover({ story, className = "" }) {
  if (story.cover_url) {
    return (
      <img
        src={story.cover_url}
        alt={`Cover of ${story.title}`}
        className={`aspect-[3/4] w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex aspect-[3/4] w-full items-center justify-center bg-accent/10 p-6 ${className}`}
    >
      <span className="text-center font-serif text-2xl text-accent">{story.title}</span>
    </div>
  );
}