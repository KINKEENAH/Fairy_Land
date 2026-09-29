import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthContext.jsx";
import { useAdminData } from "./useAdmin.js";

const navClass = ({ isActive }) =>
  isActive ? "font-medium text-accent" : "text-ink/70 hover:text-accent";

function AdminShell() {
  const { logout } = useAuth();
  const { data: pendingData, reload: refreshPendingCount } = useAdminData(
    "/api/admin/comments?status=pending"
  );
  const pendingCount = pendingData?.pendingCount ?? 0;

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <header className="border-b border-ink/10 bg-white/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/admin" className="font-serif text-xl font-semibold">
            Admin
          </Link>

          <nav className="flex gap-4 text-sm">
            <NavLink to="/admin" end className={navClass}>
              Stories
            </NavLink>
            <NavLink to="/admin/comments" className={navClass}>
              Comments
              {pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-xs font-medium text-white">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link to="/" className="text-ink/60 hover:text-accent">
              View site
            </Link>
            <button type="button" onClick={logout} className="text-ink/60 hover:text-red-700">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet context={{ refreshPendingCount }} />
      </main>
    </div>
  );
}

export default function AdminLayout() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <AdminShell />;
}