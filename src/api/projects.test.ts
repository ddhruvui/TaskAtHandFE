import { beforeEach, describe, expect, it, vi } from "vitest";
import * as projectsApi from "./projects";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("projectsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /projects and returns the project list", async () => {
    const projects = [
      {
        _id: "p1",
        name: "Automated Stock Market",
        priority: 0,
        tasks: [
          {
            name: "get data from EODHD",
            date: "2026-08-01",
            done: false,
            todoTaskId: "t1",
          },
          {
            name: "get data from Nasdaq",
            date: null,
            done: false,
            todoTaskId: null,
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    apiFetchMock.mockResolvedValue(projects);

    const result = await projectsApi.getAll();

    expect(apiFetchMock).toHaveBeenCalledWith("/projects");
    expect(result).toEqual(projects);
  });

  it("create calls POST /projects with body", async () => {
    const created = {
      _id: "p1",
      name: "Automated Stock Market",
      priority: 0,
      tasks: [
        {
          name: "get data from EODHD",
          date: null,
          done: false,
          todoTaskId: null,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(created);

    const result = await projectsApi.create({
      name: "Automated Stock Market",
      tasks: [{ name: "get data from EODHD" }],
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/projects", {
      method: "POST",
      body: JSON.stringify({
        name: "Automated Stock Market",
        tasks: [{ name: "get data from EODHD" }],
      }),
    });
    expect(result).toEqual(created);
  });

  it("update calls PUT /projects/:id with partial body", async () => {
    const updated = {
      _id: "p1",
      name: "Automated Stock Market",
      priority: 0,
      tasks: [
        {
          name: "get data from EODHD",
          date: "2026-08-01",
          done: true,
          todoTaskId: null,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(updated);

    const result = await projectsApi.update("p1", {
      tasks: [
        {
          name: "get data from EODHD",
          date: "2026-08-01",
          done: true,
          todoTaskId: null,
        },
      ],
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/p1", {
      method: "PUT",
      body: JSON.stringify({
        tasks: [
          {
            name: "get data from EODHD",
            date: "2026-08-01",
            done: true,
            todoTaskId: null,
          },
        ],
      }),
    });
    expect(result).toEqual(updated);
  });

  it("update calls PUT /projects/:id with a priority move", async () => {
    const updated = {
      _id: "p1",
      name: "Automated Stock Market",
      priority: 2,
      tasks: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(updated);

    const result = await projectsApi.update("p1", { priority: 2 });

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/p1", {
      method: "PUT",
      body: JSON.stringify({ priority: 2 }),
    });
    expect(result).toEqual(updated);
  });

  it("remove calls DELETE /projects/:id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "p1" });

    const result = await projectsApi.remove("p1");

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/p1", {
      method: "DELETE",
    });
    expect(result).toEqual({ deleted: "p1" });
  });
});
