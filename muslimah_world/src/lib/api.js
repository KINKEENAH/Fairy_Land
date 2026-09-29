const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const isFormData = body instanceof FormData;

  const headers = {};
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message ?? `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}