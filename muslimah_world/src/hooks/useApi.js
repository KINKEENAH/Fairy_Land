import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";

export function useApi(path) {
  const [result, setResult] = useState({ path: null });

  useEffect(() => {
    let ignore = false;

    apiRequest(path)
      .then((data) => {
        if (!ignore) setResult({ path, status: "ready", data });
      })
      .catch((err) => {
        if (!ignore) {
          setResult({ path, status: "error", error: err.message, errorStatus: err.status });
        }
      });

    return () => {
      ignore = true;
    };
  }, [path]);

  if (result.path !== path) {
    return { status: "loading", data: null, error: "", errorStatus: null };
  }
  return result;
}