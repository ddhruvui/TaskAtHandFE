import { beforeEach, describe, expect, it, vi } from "vitest";
import * as eventsApi from "./events";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("eventsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /events and returns the event list", async () => {
    const events = [
      {
        _id: "e1",
        name: "Burger Night",
        tasks: ["Buy buns", "Buy patties"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    apiFetchMock.mockResolvedValue(events);

    const result = await eventsApi.getAll();

    expect(apiFetchMock).toHaveBeenCalledWith("/events");
    expect(result).toEqual(events);
  });

  it("create calls POST /events with body", async () => {
    const created = {
      _id: "e1",
      name: "Burger Night",
      tasks: ["Buy buns"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(created);

    const result = await eventsApi.create({
      name: "Burger Night",
      tasks: ["Buy buns"],
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/events", {
      method: "POST",
      body: JSON.stringify({ name: "Burger Night", tasks: ["Buy buns"] }),
    });
    expect(result).toEqual(created);
  });

  it("update calls PUT /events/:id with partial body", async () => {
    const updated = {
      _id: "e1",
      name: "Taco Night",
      tasks: ["Buy shells", "Buy salsa"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(updated);

    const result = await eventsApi.update("e1", {
      name: "Taco Night",
      tasks: ["Buy shells", "Buy salsa"],
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/events/e1", {
      method: "PUT",
      body: JSON.stringify({
        name: "Taco Night",
        tasks: ["Buy shells", "Buy salsa"],
      }),
    });
    expect(result).toEqual(updated);
  });

  it("remove calls DELETE /events/:id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "e1" });

    const result = await eventsApi.remove("e1");

    expect(apiFetchMock).toHaveBeenCalledWith("/events/e1", {
      method: "DELETE",
    });
    expect(result).toEqual({ deleted: "e1" });
  });
});
