export default function StatusBadge({ status }) {
  const published = status === "published";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        published ? "bg-green-100 text-green-800" : "bg-ink/10 text-ink/70"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}