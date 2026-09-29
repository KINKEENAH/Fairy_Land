import { useState } from "react";
import { Navigate, useLocation } from "react-router";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "./AuthContext.jsx";
import { inputClass, labelClass, primaryButton } from "./ui.js";

export default function LoginPage() {
  const { token, login } = useAuth();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });

  if (token) {
    const from = location.state?.from?.pathname ?? "/admin";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!password) return;

    setState({ status: "sending", message: "" });
    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { password },
      });
      login(result.token);
    } catch (err) {
      setPassword("");
      setState({ status: "error", message: err.message });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 font-sans text-ink">
      <title>Log in · Admin</title>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-lg border border-ink/10 bg-white/70 p-6 shadow-sm"
      >
        <h1 className="font-serif text-2xl font-semibold">Admin login</h1>

        <div>
          <label htmlFor="admin-password" className={labelClass}>
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            className={inputClass}
          />
        </div>

        {state.status === "error" && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={state.status === "sending" || !password}
          className={`${primaryButton} w-full`}
        >
          {state.status === "sending" ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}