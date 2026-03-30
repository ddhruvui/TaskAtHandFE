import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3002");
  });

  it("sends request with JSON defaults and returns parsed data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn().mockResolvedValue({ value: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiFetch<{ value: number }>("/headers");

    expect(data).toEqual({ value: 42 });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3002/headers", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  });

  it("merges caller-provided headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/tasks", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify({ name: "T1" }),
    });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3002/tasks", {
      method: "POST",
      body: JSON.stringify({ name: "T1" }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  it("throws server error message when payload contains error field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: vi.fn().mockResolvedValue({ error: "headerId is required" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/tasks")).rejects.toThrow("headerId is required");
  });

  it("throws fallback status error when payload has no error field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/headers")).rejects.toThrow(
      "API error 500: Internal Server Error",
    );
  });
});
