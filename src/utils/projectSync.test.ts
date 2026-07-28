import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  syncProjectTasksForTodoDone,
  syncProjectTasksForTodoEdit,
  syncProjectTaskOrderForTodo,
  unlinkProjectTasksForTodoTasks,
} from "./projectSync";
import * as projectsApi from "../api/projects";
import type { Project, ProjectTask } from "../types";

vi.mock("../api/projects", () => ({ getAll: vi.fn(), update: vi.fn() }));

const getProjects = vi.mocked(projectsApi.getAll);
const updateProject = vi.mocked(projectsApi.update);

const task = (over: Partial<ProjectTask> = {}): ProjectTask => ({
  name: "Step",
  notes: "",
  date: null,
  done: false,
  todoTaskId: null,
  ...over,
});

const project = (_id: string, tasks: ProjectTask[]): Project => ({
  _id,
  name: `P-${_id}`,
  priority: 0,
  tasks,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

/** The task list the helper sent for `projectId`, or undefined if it never wrote. */
function written(projectId: string): ProjectTask[] | undefined {
  const call = updateProject.mock.calls.find((c) => c[0] === projectId);
  return call?.[1].tasks as ProjectTask[] | undefined;
}

beforeEach(() => {
  getProjects.mockReset();
  updateProject.mockReset();
  updateProject.mockResolvedValue({} as never);
});

describe("syncProjectTasksForTodoDone", () => {
  it("mirrors the new done state onto every task linked to the todo task", async () => {
    getProjects.mockResolvedValue([
      project("p1", [
        task({ name: "A", todoTaskId: "t1" }),
        task({ name: "B" }),
      ]),
    ]);

    await syncProjectTasksForTodoDone("t1", true);

    expect(written("p1")).toEqual([
      task({ name: "A", todoTaskId: "t1", done: true }),
      task({ name: "B" }),
    ]);
  });

  it("does not write when no linked task changes state", async () => {
    getProjects.mockResolvedValue([
      project("p1", [task({ todoTaskId: "t1", done: true })]),
    ]);

    await syncProjectTasksForTodoDone("t1", true);

    expect(updateProject).not.toHaveBeenCalled();
  });
});

describe("syncProjectTasksForTodoEdit", () => {
  it("mirrors a renamed date task onto the project", async () => {
    getProjects.mockResolvedValue([
      project("p1", [
        task({ name: "Old", date: "2026-05-01", todoTaskId: "t1" }),
      ]),
    ]);

    await syncProjectTasksForTodoEdit(
      "t1",
      "New",
      { type: "date", value: "2026-06-01" },
      "",
    );

    expect(written("p1")).toEqual([
      task({ name: "New", date: "2026-06-01", todoTaskId: "t1" }),
    ]);
  });

  it("mirrors edited notes onto the project", async () => {
    getProjects.mockResolvedValue([
      project("p1", [
        task({ name: "A", notes: "old", date: "2026-05-01", todoTaskId: "t1" }),
      ]),
    ]);

    await syncProjectTasksForTodoEdit(
      "t1",
      "A",
      { type: "date", value: "2026-05-01" },
      "new",
    );

    expect(written("p1")).toEqual([
      task({ name: "A", notes: "new", date: "2026-05-01", todoTaskId: "t1" }),
    ]);
  });

  it("treats the todo's default placeholder note as empty", async () => {
    // The linked todo task carries `Step towards "P-p1"` when the project
    // task has no notes — that placeholder must not become project notes.
    getProjects.mockResolvedValue([
      project("p1", [
        task({ name: "A", notes: "", date: "2026-05-01", todoTaskId: "t1" }),
      ]),
    ]);

    await syncProjectTasksForTodoEdit(
      "t1",
      "A",
      { type: "date", value: "2026-05-01" },
      'Step towards "P-p1"',
    );

    expect(updateProject).not.toHaveBeenCalled();
  });

  it("clears the project date for a recurring ECD but keeps the link", async () => {
    getProjects.mockResolvedValue([
      project("p1", [task({ name: "A", date: "2026-05-01", todoTaskId: "t1" })]),
    ]);

    await syncProjectTasksForTodoEdit(
      "t1",
      "A",
      { type: "day_of_week", value: ["Mon"] },
      "",
    );

    expect(written("p1")).toEqual([
      task({ name: "A", date: null, todoTaskId: "t1" }),
    ]);
  });

  it("clears the project date when the ECD is removed entirely", async () => {
    getProjects.mockResolvedValue([
      project("p1", [task({ name: "A", date: "2026-05-01", todoTaskId: "t1" })]),
    ]);

    await syncProjectTasksForTodoEdit("t1", "A", null, "");

    expect(written("p1")).toEqual([
      task({ name: "A", date: null, todoTaskId: "t1" }),
    ]);
  });
});

describe("syncProjectTaskOrderForTodo", () => {
  it("re-arranges linked tasks into the todo's order, leaving unlinked slots alone", async () => {
    getProjects.mockResolvedValue([
      project("p1", [
        task({ name: "A", todoTaskId: "t1" }),
        task({ name: "Unlinked" }),
        task({ name: "B", todoTaskId: "t2" }),
      ]),
    ]);

    // Todo order is now B, A
    await syncProjectTaskOrderForTodo(["t2", "t1"]);

    expect(written("p1")?.map((t) => t.name)).toEqual(["B", "Unlinked", "A"]);
  });

  it("is a no-op for a single-task order", async () => {
    await syncProjectTaskOrderForTodo(["t1"]);
    expect(getProjects).not.toHaveBeenCalled();
  });

  it("does not write when a project has fewer than two linked tasks", async () => {
    getProjects.mockResolvedValue([
      project("p1", [
        task({ name: "A", todoTaskId: "t1" }),
        task({ name: "B" }),
      ]),
    ]);

    await syncProjectTaskOrderForTodo(["t1", "t2"]);

    expect(updateProject).not.toHaveBeenCalled();
  });
});

describe("unlinkProjectTasksForTodoTasks", () => {
  it("drops the link and the date for an undone task", async () => {
    getProjects.mockResolvedValue([
      project("p1", [task({ name: "A", date: "2026-05-01", todoTaskId: "t1" })]),
    ]);

    await unlinkProjectTasksForTodoTasks(["t1"]);

    expect(written("p1")).toEqual([
      task({ name: "A", date: null, todoTaskId: null }),
    ]);
  });

  it("keeps the date on a done task for the record", async () => {
    getProjects.mockResolvedValue([
      project("p1", [
        task({ name: "A", date: "2026-05-01", todoTaskId: "t1", done: true }),
      ]),
    ]);

    await unlinkProjectTasksForTodoTasks(["t1"]);

    expect(written("p1")).toEqual([
      task({ name: "A", date: "2026-05-01", todoTaskId: null, done: true }),
    ]);
  });

  it("is a no-op for an empty id list", async () => {
    await unlinkProjectTasksForTodoTasks([]);
    expect(getProjects).not.toHaveBeenCalled();
  });
});
