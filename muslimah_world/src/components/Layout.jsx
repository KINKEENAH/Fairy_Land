import { Link, Outlet, ScrollRestoration } from "react-router";

const SITE_NAME = "Stories";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold">
            {SITE_NAME}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ink/10 py-6 text-center text-sm text-ink/60">
        © {new Date().getFullYear()} {SITE_NAME}
      </footer>
      <ScrollRestoration/>
    </div>
  );
}