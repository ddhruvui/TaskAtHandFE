/**
 * Base HTTP client for the TaskAtHand API.
 * Base URL is read from the VITE_API_BASE_URL environment variable.
 * All requests send/accept JSON and surface the `error` field from the
 * standard error response `{ success: false, error: "..." }` as a thrown Error.
 *
 * API Reference: TaskAtHandBE/API_REFERENCE.md
 * Base URL: http://localhost:3002
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface ApiSuccess {
  success: true;
}

interface ApiError {
  success: false;
  error: string;
  message?: string;
}

type ApiResponse<T> = (T & ApiSuccess) | ApiError;

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T & ApiSuccess> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data: ApiResponse<T> = await res.json();

  if (!data.success) {
    throw new Error((data as ApiError).error ?? `API error ${res.status}`);
  }

  return data as T & ApiSuccess;
}
