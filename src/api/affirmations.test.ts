import { beforeEach, describe, expect, it, vi } from "vitest";
import * as affirmationsApi from "./affirmations";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("affirmationsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /affirmations and returns the affirmation list", async () => {
    const affirmations = [
      {
        _id: "a1",
        name: "Thank you blessing",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        _id: "a2",
        name: "I am enough",
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    apiFetchMock.mockResolvedValue(affirmations);

    const result = await affirmationsApi.getAll();

    expect(apiFetchMock).toHaveBeenCalledWith("/affirmations");
    expect(result).toEqual(affirmations);
  });

  it("create calls POST /affirmations with body", async () => {
    const created = {
      _id: "a1",
      name: "Thank you blessing",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(created);

    const result = await affirmationsApi.create({
      name: "Thank you blessing",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/affirmations", {
      method: "POST",
      body: JSON.stringify({ name: "Thank you blessing" }),
    });
    expect(result).toEqual(created);
  });

  it("update calls PUT /affirmations/:id with body", async () => {
    const updated = {
      _id: "a1",
      name: "Thank you for this day",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(updated);

    const result = await affirmationsApi.update("a1", {
      name: "Thank you for this day",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/affirmations/a1", {
      method: "PUT",
      body: JSON.stringify({ name: "Thank you for this day" }),
    });
    expect(result).toEqual(updated);
  });

  it("remove calls DELETE /affirmations/:id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "a1" });

    const result = await affirmationsApi.remove("a1");

    expect(apiFetchMock).toHaveBeenCalledWith("/affirmations/a1", {
      method: "DELETE",
    });
    expect(result).toEqual({ deleted: "a1" });
  });
});
