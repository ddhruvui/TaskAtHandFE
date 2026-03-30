import { beforeEach, describe, expect, it, vi } from "vitest";
import * as headersApi from "./headers";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("headersApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /headers", async () => {
    apiFetchMock.mockResolvedValue([{ _id: "h1", name: "Work", priority: 0 }]);

    await headersApi.getAll();

    expect(apiFetchMock).toHaveBeenCalledWith("/headers");
  });

  it("create calls POST /headers with body", async () => {
    apiFetchMock.mockResolvedValue({ _id: "h1", name: "Work", priority: 0 });

    await headersApi.create({ name: "Work" });

    expect(apiFetchMock).toHaveBeenCalledWith("/headers", {
      method: "POST",
      body: JSON.stringify({ name: "Work" }),
    });
  });

  it("update calls PUT /headers/:id with partial body", async () => {
    apiFetchMock.mockResolvedValue({
      _id: "h1",
      name: "Work Projects",
      priority: 1,
    });

    await headersApi.update("h1", { name: "Work Projects", priority: 1 });

    expect(apiFetchMock).toHaveBeenCalledWith("/headers/h1", {
      method: "PUT",
      body: JSON.stringify({ name: "Work Projects", priority: 1 }),
    });
  });

  it("remove calls DELETE /headers/:id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "h1", tasksDeleted: 2 });

    await headersApi.remove("h1");

    expect(apiFetchMock).toHaveBeenCalledWith("/headers/h1", {
      method: "DELETE",
    });
  });
});
