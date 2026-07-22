import { beforeEach, describe, expect, it, vi } from "vitest";
import * as tasksApi from "./tasks";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("tasksApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /tasks?headerId=:id", async () => {
    apiFetchMock.mockResolvedValue([]);

    await tasksApi.getAll("h1");

    expect(apiFetchMock).toHaveBeenCalledWith("/tasks?headerId=h1");
  });

  it("create calls POST /tasks with body", async () => {
    apiFetchMock.mockResolvedValue({
      _id: "t1",
      name: "T1",
      headerId: "h1",
      priority: 0,
      done: false,
      notes: "",
      ecd: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await tasksApi.create({ name: "T1", headerId: "h1" });

    expect(apiFetchMock).toHaveBeenCalledWith("/tasks", {
      method: "POST",
      body: JSON.stringify({ name: "T1", headerId: "h1" }),
    });
  });

  it("update calls PUT /tasks/:id with partial body", async () => {
    apiFetchMock.mockResolvedValue({
      _id: "t1",
      name: "Updated",
      headerId: "h1",
      priority: 0,
      done: true,
      notes: "",
      ecd: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    await tasksApi.update("t1", { done: true, name: "Updated" });

    expect(apiFetchMock).toHaveBeenCalledWith("/tasks/t1", {
      method: "PUT",
      body: JSON.stringify({ done: true, name: "Updated" }),
    });
  });

  it("remove calls DELETE /tasks/:id without a body when no reason is given", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "t1" });

    await tasksApi.remove("t1");

    expect(apiFetchMock).toHaveBeenCalledWith("/tasks/t1", {
      method: "DELETE",
    });
  });

  it("remove sends the reason in the body when deleting an undone task", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "t1" });

    await tasksApi.remove("t1", "no longer needed");

    expect(apiFetchMock).toHaveBeenCalledWith("/tasks/t1", {
      method: "DELETE",
      body: JSON.stringify({ reason: "no longer needed" }),
    });
  });
});
