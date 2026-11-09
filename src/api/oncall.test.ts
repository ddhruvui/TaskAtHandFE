import { beforeEach, describe, expect, it, vi } from "vitest";
import * as onCallApi from "./oncall";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

const SHIFT = {
  _id: "s1",
  date: "2026-11-16",
  start: "09:00",
  end: "22:00",
  type: "primary" as const,
  note: "",
  createdAt: "2026-11-09T00:00:00.000Z",
  updatedAt: "2026-11-09T00:00:00.000Z",
};

describe("onCallApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /oncall and returns the list", async () => {
    apiFetchMock.mockResolvedValue([SHIFT]);
    const result = await onCallApi.getAll();
    expect(apiFetchMock).toHaveBeenCalledWith("/oncall");
    expect(result).toEqual([SHIFT]);
  });

  it("create POSTs the shift body", async () => {
    apiFetchMock.mockResolvedValue(SHIFT);
    const body = { date: "2026-11-16", start: "09:00", end: "22:00" };
    const result = await onCallApi.create(body);
    expect(apiFetchMock).toHaveBeenCalledWith("/oncall", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect(result).toEqual(SHIFT);
  });

  it("update PUTs a partial body to /oncall/:id", async () => {
    apiFetchMock.mockResolvedValue({ ...SHIFT, type: "secondary" });
    await onCallApi.update("s1", { type: "secondary" });
    expect(apiFetchMock).toHaveBeenCalledWith("/oncall/s1", {
      method: "PUT",
      body: JSON.stringify({ type: "secondary" }),
    });
  });

  it("remove DELETEs /oncall/:id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "s1" });
    const result = await onCallApi.remove("s1");
    expect(apiFetchMock).toHaveBeenCalledWith("/oncall/s1", {
      method: "DELETE",
    });
    expect(result).toEqual({ deleted: "s1" });
  });

  it("propagates API errors", async () => {
    apiFetchMock.mockRejectedValue(new Error("Shift overlaps an existing one"));
    await expect(
      onCallApi.create({ date: "2026-11-16", start: "09:00", end: "22:00" }),
    ).rejects.toThrow("overlaps");
  });
});
