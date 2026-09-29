import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <h1 className="font-serif text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-ink/70">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 inline-block text-accent underline">
        Back to the library
      </Link>
    </section>
  );
}