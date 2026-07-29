import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  syncLifeEventsForTodoDone,
  syncLifeEventsForTodoEdit,
  unlinkLifeEventsForTodoTasks,
} from "./lifeEventSync";
import * as lifeEventsApi from "../api/lifeevents";
import type { LifeEvent } from "../types";

vi.mock("../api/lifeevents", () => ({ getAll: vi.fn(), update: vi.fn() }));

const getLifeEvents = vi.mocked(lifeEventsApi.getAll);
const updateLifeEvent = vi.mocked(lifeEventsApi.update);

const event = (_id: string, over: Partial<LifeEvent> = {}): LifeEvent => ({
  _id,
  name: "Wife's birthday",
  date: "7/3",
  lastAddedYear: 2026,
  done: false,
  todoTaskId: null,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

beforeEach(() => {
  getLifeEvents.mockReset();
  updateLifeEvent.mockReset();
  updateLifeEvent.mockResolvedValue({} as never);
});

describe("syncLifeEventsForTodoDone", () => {
  it("mirrors the new done state onto every event linked to the todo task", async () => {
    getLifeEvents.mockResolvedValue([
      event("e1", { todoTaskId: "t1" }),
      event("e2", { todoTaskId: "t2" }),
    ]);

    await syncLifeEventsForTodoDone("t1", true);

    expect(updateLifeEvent).toHaveBeenCalledTimes(1);
    expect(updateLifeEvent).toHaveBeenCalledWith("e1", { done: true });
  });

  it("does not write when the linked event already has that state", async () => {
    getLifeEvents.mockResolvedValue([
      event("e1", { todoTaskId: "t1", done: true }),
    ]);

    await syncLifeEventsForTodoDone("t1", true);

    expect(updateLifeEvent).not.toHaveBeenCalled();
  });

  it("does not touch unlinked events", async () => {
    getLifeEvents.mockResolvedValue([event("e1")]);

    await syncLifeEventsForTodoDone("t1", true);

    expect(updateLifeEvent).not.toHaveBeenCalled();
  });
});

describe("syncLifeEventsForTodoEdit", () => {
  it("mirrors a rename onto the linked event", async () => {
    getLifeEvents.mockResolvedValue([event("e1", { todoTaskId: "t1" })]);

    await syncLifeEventsForTodoEdit("t1", "Wife's birthday!");

    expect(updateLifeEvent).toHaveBeenCalledWith("e1", {
      name: "Wife's birthday!",
    });
  });

  it("does not write when the name is unchanged", async () => {
    getLifeEvents.mockResolvedValue([event("e1", { todoTaskId: "t1" })]);

    await syncLifeEventsForTodoEdit("t1", "Wife's birthday");

    expect(updateLifeEvent).not.toHaveBeenCalled();
  });
});

describe("unlinkLifeEventsForTodoTasks", () => {
  it("clears the link on every event backed by a deleted todo task", async () => {
    getLifeEvents.mockResolvedValue([
      event("e1", { todoTaskId: "t1" }),
      event("e2", { todoTaskId: "t2" }),
      event("e3"),
    ]);

    await unlinkLifeEventsForTodoTasks(["t1", "t2"]);

    expect(updateLifeEvent).toHaveBeenCalledTimes(2);
    expect(updateLifeEvent).toHaveBeenCalledWith("e1", { todoTaskId: null });
    expect(updateLifeEvent).toHaveBeenCalledWith("e2", { todoTaskId: null });
  });

  it("keeps the done state as-is when unlinking", async () => {
    getLifeEvents.mockResolvedValue([
      event("e1", { todoTaskId: "t1", done: true }),
    ]);

    await unlinkLifeEventsForTodoTasks(["t1"]);

    expect(updateLifeEvent).toHaveBeenCalledWith("e1", { todoTaskId: null });
  });

  it("skips the fetch entirely for an empty id list", async () => {
    await unlinkLifeEventsForTodoTasks([]);

    expect(getLifeEvents).not.toHaveBeenCalled();
  });
});
