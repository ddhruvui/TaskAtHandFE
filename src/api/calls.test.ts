import { beforeEach, describe, expect, it, vi } from "vitest";
import * as callsApi from "./calls";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("callsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /calls and returns the call list", async () => {
    const calls = [
      {
        _id: "c1",
        name: "Grandma",
        frequency: "biweekly",
        done: false,
        doneAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        _id: "c2",
        name: "Uncle Raj",
        frequency: "monthly",
        done: true,
        doneAt: "2026-01-03T00:00:00.000Z",
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
    ];
    apiFetchMock.mockResolvedValue(calls);

    const result = await callsApi.getAll();

    expect(apiFetchMock).toHaveBeenCalledWith("/calls");
    expect(result).toEqual(calls);
  });

  it("create calls POST /calls with body", async () => {
    const created = {
      _id: "c1",
      name: "Grandma",
      frequency: "biweekly",
      done: false,
      doneAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(created);

    const result = await callsApi.create({
      name: "Grandma",
      frequency: "biweekly",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/calls", {
      method: "POST",
      body: JSON.stringify({ name: "Grandma", frequency: "biweekly" }),
    });
    expect(result).toEqual(created);
  });

  it("update calls PUT /calls/:id with partial body", async () => {
    const updated = {
      _id: "c1",
      name: "Grandmother",
      frequency: "monthly",
      done: false,
      doneAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(updated);

    const result = await callsApi.update("c1", {
      name: "Grandmother",
      frequency: "monthly",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/calls/c1", {
      method: "PUT",
      body: JSON.stringify({ name: "Grandmother", frequency: "monthly" }),
    });
    expect(result).toEqual(updated);
  });

  it("update calls PUT /calls/:id with a done-only body", async () => {
    const updated = {
      _id: "c1",
      name: "Grandma",
      frequency: "biweekly",
      done: true,
      doneAt: "2026-01-05T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(updated);

    const result = await callsApi.update("c1", { done: true });

    expect(apiFetchMock).toHaveBeenCalledWith("/calls/c1", {
      method: "PUT",
      body: JSON.stringify({ done: true }),
    });
    expect(result).toEqual(updated);
  });

  it("remove calls DELETE /calls/:id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "c1" });

    const result = await callsApi.remove("c1");

    expect(apiFetchMock).toHaveBeenCalledWith("/calls/c1", {
      method: "DELETE",
    });
    expect(result).toEqual({ deleted: "c1" });
  });
});
