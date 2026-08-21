import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vacationsApi from "./vacations";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

const VACATION = {
  _id: "v1",
  startDate: "2026-09-03",
  endDate: "2026-09-15",
  note: "Kerala trip",
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

describe("vacationsApi", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("getAll calls GET /vacations and returns the list", async () => {
    apiFetchMock.mockResolvedValue([VACATION]);

    const result = await vacationsApi.getAll();

    expect(apiFetchMock).toHaveBeenCalledWith("/vacations");
    expect(result).toEqual([VACATION]);
  });

  it("getStatus calls GET /vacations/status", async () => {
    const status = {
      today: "2026-09-07",
      onVacation: true,
      active: {
        ...VACATION,
        totalDays: 13,
        dayOfVacation: 5,
        daysRemaining: 8,
      },
      upcoming: [],
      justReturnedFrom: null,
    };
    apiFetchMock.mockResolvedValue(status);

    const result = await vacationsApi.getStatus();

    expect(apiFetchMock).toHaveBeenCalledWith("/vacations/status");
    expect(result.onVacation).toBe(true);
    expect(result.active?.dayOfVacation).toBe(5);
  });

  it("getTasks calls GET /vacations/:id/tasks", async () => {
    apiFetchMock.mockResolvedValue([]);

    await vacationsApi.getTasks("v1");

    expect(apiFetchMock).toHaveBeenCalledWith("/vacations/v1/tasks");
  });

  it("create POSTs both dates and the note", async () => {
    apiFetchMock.mockResolvedValue(VACATION);

    const result = await vacationsApi.create({
      startDate: "2026-09-03",
      endDate: "2026-09-15",
      note: "Kerala trip",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/vacations", {
      method: "POST",
      body: JSON.stringify({
        startDate: "2026-09-03",
        endDate: "2026-09-15",
        note: "Kerala trip",
      }),
    });
    expect(result).toEqual(VACATION);
  });

  it("update PUTs only the fields it was given", async () => {
    apiFetchMock.mockResolvedValue({ ...VACATION, endDate: "2026-09-09" });

    await vacationsApi.update("v1", { endDate: "2026-09-09" });

    expect(apiFetchMock).toHaveBeenCalledWith("/vacations/v1", {
      method: "PUT",
      body: JSON.stringify({ endDate: "2026-09-09" }),
    });
  });

  it("remove DELETEs and returns the deleted id", async () => {
    apiFetchMock.mockResolvedValue({ deleted: "v1" });

    const result = await vacationsApi.remove("v1");

    expect(apiFetchMock).toHaveBeenCalledWith("/vacations/v1", {
      method: "DELETE",
    });
    expect(result).toEqual({ deleted: "v1" });
  });

  it("propagates the backend's overlap rejection", async () => {
    apiFetchMock.mockRejectedValue(
      new Error("Vacation overlaps an existing one (2026-09-01 to 2026-09-10)"),
    );

    await expect(
      vacationsApi.create({ startDate: "2026-09-03", endDate: "2026-09-15" }),
    ).rejects.toThrow(/overlaps/);
  });
});
