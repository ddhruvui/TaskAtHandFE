import { beforeEach, describe, expect, it, vi } from "vitest";
import * as insightsApi from "./insights";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("insightsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getStats calls GET /insights/stats?days=28 by default", async () => {
    const stats = { periodDays: 28, eventCount: 0, habits: [] };
    apiFetchMock.mockResolvedValue(stats);

    const result = await insightsApi.getStats();

    expect(apiFetchMock).toHaveBeenCalledWith("/insights/stats?days=28");
    expect(result).toEqual(stats);
  });

  it("getStats calls GET /insights/stats with explicit days param", async () => {
    apiFetchMock.mockResolvedValue({ periodDays: 7, eventCount: 0, habits: [] });

    await insightsApi.getStats(7);

    expect(apiFetchMock).toHaveBeenCalledWith("/insights/stats?days=7");
  });

  it("getLatest calls GET /insights/latest", async () => {
    const insight = {
      _id: "i1",
      generatedAt: "2026-01-01T00:00:00.000Z",
      periodDays: 28,
    };
    apiFetchMock.mockResolvedValue(insight);

    const result = await insightsApi.getLatest();

    expect(apiFetchMock).toHaveBeenCalledWith("/insights/latest");
    expect(result).toEqual(insight);
  });

  it("generate calls POST /insights/generate with days body", async () => {
    apiFetchMock.mockResolvedValue({
      _id: "i1",
      generatedAt: "2026-01-01T00:00:00.000Z",
      periodDays: 14,
    });

    await insightsApi.generate(14);

    expect(apiFetchMock).toHaveBeenCalledWith("/insights/generate", {
      method: "POST",
      body: JSON.stringify({ days: 14 }),
    });
  });

  it("generate calls POST /insights/generate with empty body when days is omitted", async () => {
    apiFetchMock.mockResolvedValue({
      _id: "i1",
      generatedAt: "2026-01-01T00:00:00.000Z",
      periodDays: 28,
    });

    await insightsApi.generate();

    expect(apiFetchMock).toHaveBeenCalledWith("/insights/generate", {
      method: "POST",
      body: JSON.stringify({}),
    });
  });
});
