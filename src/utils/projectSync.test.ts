import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncProjectHeaderOrder } from "./projectSync";
import * as projectsApi from "../api/projects";
import * as headersApi from "../api/headers";

vi.mock("../api/projects", () => ({ getAll: vi.fn() }));
vi.mock("../api/headers", () => ({ getAll: vi.fn(), update: vi.fn() }));

const getProjects = vi.mocked(projectsApi.getAll);
const getHeaders = vi.mocked(headersApi.getAll);
const updateHeader = vi.mocked(headersApi.update);

type H = { _id: string; name: string; priority: number };

const hdr = (id: string, name: string, priority: number): H => ({
  _id: id,
  name,
  priority,
});

/**
 * Apply one `update(id, { priority })` the way the backend does: moving a
 * header to a new priority shifts the ones in between to keep 0..n-1
 * contiguous. Used to turn the sequence of update calls the helper issued
 * back into a final ordering, so we assert on the outcome, not the exact
 * call sequence.
 */
function applyUpdate(headers: H[], id: string, newP: number) {
  const h = headers.find((x) => x._id === id)!;
  const oldP = h.priority;
  if (newP === oldP) return;
  for (const x of headers) {
    if (x._id === id) continue;
    if (newP < oldP && x.priority >= newP && x.priority < oldP) x.priority += 1;
    if (newP > oldP && x.priority > oldP && x.priority <= newP) x.priority -= 1;
  }
  h.priority = newP;
}

/** Names in final priority order after replaying the helper's update calls. */
function finalOrder(initial: H[]): string[] {
  const headers = initial.map((h) => ({ ...h }));
  for (const call of updateHeader.mock.calls) {
    applyUpdate(headers, call[0] as string, (call[1] as { priority: number }).priority);
  }
  return [...headers]
    .sort((a, b) => a.priority - b.priority)
    .map((h) => h.name);
}

describe("syncProjectHeaderOrder", () => {
  beforeEach(() => {
    getProjects.mockReset();
    getHeaders.mockReset();
    updateHeader.mockReset();
    updateHeader.mockResolvedValue({} as never);
  });

  it("keeps the top non-project header at 0 and places project headers below it in project order", async () => {
    getProjects.mockResolvedValue([
      { name: "Home Improvement", priority: 0 },
      { name: "Automated Stock Market", priority: 1 },
    ] as never);
    const initial = [
      hdr("g", "Groceries", 0),
      hdr("asm", "Automated Stock Market", 1),
      hdr("hi", "Home Improvement", 2),
    ];
    getHeaders.mockResolvedValue(initial as never);

    await syncProjectHeaderOrder();

    expect(finalOrder(initial)).toEqual([
      "Groceries",
      "Home Improvement",
      "Automated Stock Market",
    ]);
  });

  it("starts the project block at priority 0 when there are no non-project headers", async () => {
    getProjects.mockResolvedValue([
      { name: "Home Improvement", priority: 0 },
      { name: "Automated Stock Market", priority: 1 },
    ] as never);
    const initial = [
      hdr("asm", "Automated Stock Market", 0),
      hdr("hi", "Home Improvement", 1),
    ];
    getHeaders.mockResolvedValue(initial as never);

    await syncProjectHeaderOrder();

    expect(finalOrder(initial)).toEqual([
      "Home Improvement",
      "Automated Stock Market",
    ]);
  });

  it("matches project priority order case-insensitively", async () => {
    getProjects.mockResolvedValue([
      { name: "Automated Stock Market", priority: 0 },
      { name: "Home Improvement", priority: 1 },
    ] as never);
    const initial = [
      hdr("hi", "home improvement", 0),
      hdr("asm", "AUTOMATED STOCK MARKET", 1),
    ];
    getHeaders.mockResolvedValue(initial as never);

    await syncProjectHeaderOrder();

    expect(finalOrder(initial)).toEqual([
      "AUTOMATED STOCK MARKET",
      "home improvement",
    ]);
  });

  it("does nothing when the headers are already in order", async () => {
    getProjects.mockResolvedValue([
      { name: "Home Improvement", priority: 0 },
      { name: "Automated Stock Market", priority: 1 },
    ] as never);
    getHeaders.mockResolvedValue([
      hdr("g", "Groceries", 0),
      hdr("hi", "Home Improvement", 1),
      hdr("asm", "Automated Stock Market", 2),
    ] as never);

    await syncProjectHeaderOrder();

    expect(updateHeader).not.toHaveBeenCalled();
  });

  it("does nothing when no header matches a project", async () => {
    getProjects.mockResolvedValue([
      { name: "Home Improvement", priority: 0 },
    ] as never);
    getHeaders.mockResolvedValue([
      hdr("g", "Groceries", 0),
      hdr("e", "Errands", 1),
    ] as never);

    await syncProjectHeaderOrder();

    expect(updateHeader).not.toHaveBeenCalled();
  });
});
