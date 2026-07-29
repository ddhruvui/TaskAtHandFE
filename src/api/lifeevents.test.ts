import { beforeEach, describe, expect, it, vi } from "vitest";
import * as lifeEventsApi from "./lifeevents";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

const lifeEvent = {
  _id: "e1",
  name: "Wife's birthday",
  date: "7/3",
  lastAddedYear: 2026,
  done: false,
  todoTaskId: null,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("lifeEventsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /lifeevents and returns the life event list", async () => {
    const events = [lifeEvent, { ...lifeEvent, _id: "e2", priority: 1 }];
    apiFetchMock.mockResolvedValue(events);

    const result = await lifeEventsApi.getAll();

    expect(apiFetchMock).toHaveBeenCalledWith("/lifeevents");
    expect(result).toEqual(events);
  });

  it("create calls POST /lifeevents with body", async () => {
    apiFetchMock.mockResolvedValue(lifeEvent);

    const result = await lifeEventsApi.create({
      name: "Wife's birthday",
      date: "7/3",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/lifeevents", {
      method: "POST",
      body: JSON.stringify({ name: "Wife's birthday", date: "7/3" }),
    });
    expect(result).toEqual(lifeEvent);
  });

  it("update calls PUT /lifeevents/:id with body", async () => {
    const updated = { ...lifeEvent, done: true, todoTaskId: "t1" };
    apiFetchMock.mockResolvedValue(updated);

    const result = await lifeEventsApi.update("e1", {
      done: true,
      todoTaskId: "t1",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/lifeevents/e1", {
      method: "PUT",
      body: JSON.stringify({ done: true, todoTaskId: "t1" }),
    });
    expect(result).toEqual(updated);
  });

  it("update can move a life event by priority", async () => {
    apiFetchMock.mockResolvedValue({ ...lifeEvent, priority: 1 });

    await lifeEventsApi.update("e1", { priority: 1 });

    expect(apiFetchMock).toHaveBeenCalledWith("/lifeevents/e1", {
      method: "PUT",
      body: JSON.stringify({ priority: 1 }),
    });
  });

  it("remove calls DELETE /lifeevents/:id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "e1" });

    const result = await lifeEventsApi.remove("e1");

    expect(apiFetchMock).toHaveBeenCalledWith("/lifeevents/e1", {
      method: "DELETE",
    });
    expect(result).toEqual({ deleted: "e1" });
  });
});
