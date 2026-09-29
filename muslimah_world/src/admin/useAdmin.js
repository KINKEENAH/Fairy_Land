import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "./AuthContext.jsx";

// Sends an authenticated request; logs you out if the token is rejected
export function useAdminRequest() {
  const { token, logout } = useAuth();

  return useCallback(
    async (path, options = {}) => {
      try {
        return await apiRequest(path, { ...options, token });
      } catch (err) {
        if (err.status === 401) logout();
        throw err;
      }
    },
    [token, logout]
  );
}

// Loads admin data, with reload() to refresh after a change
export function useAdminData(path) {
  const request = useAdminRequest();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ key: null });
  const key = `${path}#${version}`;

  useEffect(() => {
    let ignore = false;

    request(path)
      .then((data) => {
        if (!ignore) setResult({ key, path, status: "ready", data });
      })
      .catch((err) => {
        if (!ignore) {
          setResult({ key, path, status: "error", error: err.message, errorStatus: err.status });
        }
      });

    return () => {
      ignore = true;
    };
  }, [path, key, request]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  if (result.key === key) {
    return { ...result, reload };
  }
  // Reloading the same page: keep showing the old data until the new data arrives
  if (result.path === path && result.status === "ready") {
    return { ...result, refreshing: true, reload };
  }
  return { status: "loading", data: null, error: "", errorStatus: null, reload };
}