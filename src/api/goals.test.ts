import { beforeEach, describe, expect, it, vi } from "vitest";
import * as goalsApi from "./goals";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("goalsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /goals and returns the goal list", async () => {
    const goals = [
      {
        _id: "g1",
        name: "Improve Health",
        steps: [
          { name: "Wake up at 6", status: "under_progress" },
          { name: "Have 1 fruit a day", status: "pending" },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    apiFetchMock.mockResolvedValue(goals);

    const result = await goalsApi.getAll();

    expect(apiFetchMock).toHaveBeenCalledWith("/goals");
    expect(result).toEqual(goals);
  });

  it("create calls POST /goals with body", async () => {
    const created = {
      _id: "g1",
      name: "Improve Health",
      steps: [{ name: "Wake up at 6", status: "pending" }],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(created);

    const result = await goalsApi.create({
      name: "Improve Health",
      steps: [{ name: "Wake up at 6", status: "pending" }],
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/goals", {
      method: "POST",
      body: JSON.stringify({
        name: "Improve Health",
        steps: [{ name: "Wake up at 6", status: "pending" }],
      }),
    });
    expect(result).toEqual(created);
  });

  it("update calls PUT /goals/:id with partial body", async () => {
    const updated = {
      _id: "g1",
      name: "Get Healthy",
      steps: [{ name: "Wake up at 6", status: "under_progress" }],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(updated);

    const result = await goalsApi.update("g1", {
      steps: [{ name: "Wake up at 6", status: "under_progress" }],
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/goals/g1", {
      method: "PUT",
      body: JSON.stringify({
        steps: [{ name: "Wake up at 6", status: "under_progress" }],
      }),
    });
    expect(result).toEqual(updated);
  });

  it("remove calls DELETE /goals/:id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "g1" });

    const result = await goalsApi.remove("g1");

    expect(apiFetchMock).toHaveBeenCalledWith("/goals/g1", {
      method: "DELETE",
    });
    expect(result).toEqual({ deleted: "g1" });
  });
});
