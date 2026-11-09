import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, applyTheme, useTheme } from "./useTheme";

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  delete root.dataset.theme;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("applyTheme", () => {
  it("pins light and dark on <html data-theme>", () => {
    applyTheme("dark");
    expect(root.dataset.theme).toBe("dark");
    applyTheme("light");
    expect(root.dataset.theme).toBe("light");
  });

  it("clears the attribute for system so the OS decides", () => {
    applyTheme("dark");
    applyTheme("system");
    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});

describe("useTheme", () => {
  it("defaults to system with nothing stored", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("starts from a stored light/dark choice", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
  });

  it("ignores an unknown stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
  });

  it("cycles system → light → dark → system, persisting pinned choices", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(root.dataset.theme).toBe("light");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("system");
    // "system" is the absence of a choice, not a stored value
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("still switches when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");

    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
  });
});
