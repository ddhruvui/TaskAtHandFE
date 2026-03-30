/**
 * Base HTTP client for the TaskAtHand API.
 * Base URL is read from the VITE_API_BASE_URL environment variable.
 * All requests send/accept JSON. Errors are returned as `{ error: "..." }`
 * and thrown as Error objects.
 *
 * API Reference: API_REFERENCE.md
 * Base URL: http://localhost:3002
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface ApiError {
  error: string;
  message?: string;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const data = await res.json();

  // Check if response has an error field
  if (data && typeof data === "object" && "error" in data) {
    const errorData = data as ApiError;
    throw new Error(errorData.error ?? `API error ${res.status}`);
  }

  // Check for non-2xx status codes
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  return data as T;
}
