import { Outlet, ScrollRestoration } from "react-router";
import { AuthProvider } from "./AuthContext.jsx";

export default function AdminRoot() {
  return (
    <AuthProvider>
      <meta name="robots" content="noindex" />
      <Outlet />
      <ScrollRestoration />
    </AuthProvider>
  );
}