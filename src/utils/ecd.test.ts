import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEcdFromInputs,
  formatDateKey,
  getEcdDateKey,
  isPushedLater,
  isTaskDueToday,
  isTaskPast,
  isValidYearDate,
  todayDateKey,
} from "./ecd";

// Fixed system time: Wednesday, June 17, 2026 at noon local time.
const FAKE_NOW = new Date(2026, 5, 17, 12, 0, 0);

describe("ecd utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("todayDateKey", () => {
    it("returns the local calendar date as YYYY-MM-DD", () => {
      expect(todayDateKey()).toBe("2026-06-17");
    });

    it("uses the local date even when the UTC date has rolled over", () => {
      // 11 PM local in a UTC-5 zone is already the next day in UTC.
      vi.setSystemTime(new Date(2026, 5, 17, 23, 0, 0));
      expect(todayDateKey()).toBe("2026-06-17");
    });
  });

  describe("isTaskDueToday", () => {
    it("returns false for null ecd", () => {
      expect(isTaskDueToday(null)).toBe(false);
    });

    it("returns true for a date matching today", () => {
      expect(isTaskDueToday({ type: "date", value: "2026-06-17" })).toBe(true);
    });

    it("returns false for a date that is not today", () => {
      expect(isTaskDueToday({ type: "date", value: "2026-06-18" })).toBe(
        false,
      );
    });

    it("returns true when day_of_week includes today's weekday", () => {
      expect(
        isTaskDueToday({ type: "day_of_week", value: ["Mon", "Wed"] }),
      ).toBe(true);
    });

    it("returns false when day_of_week does not include today's weekday", () => {
      expect(
        isTaskDueToday({ type: "day_of_week", value: ["Mon", "Fri"] }),
      ).toBe(false);
    });

    it("returns true when day_of_month includes today's date number", () => {
      expect(isTaskDueToday({ type: "day_of_month", value: [1, 17] })).toBe(
        true,
      );
    });

    it("returns false when day_of_month does not include today's date number", () => {
      expect(isTaskDueToday({ type: "day_of_month", value: [1, 15] })).toBe(
        false,
      );
    });

    it("returns true when day_of_year matches today in D/M/YYYY", () => {
      expect(isTaskDueToday({ type: "day_of_year", value: "17/6/2026" })).toBe(
        true,
      );
    });

    it("returns false when day_of_year does not match today", () => {
      expect(isTaskDueToday({ type: "day_of_year", value: "18/6/2026" })).toBe(
        false,
      );
    });
  });

  describe("isTaskPast", () => {
    it("returns false for null ecd", () => {
      expect(isTaskPast(null)).toBe(false);
    });

    it("returns true for a past date", () => {
      expect(isTaskPast({ type: "date", value: "2026-06-16" })).toBe(true);
    });

    it("returns false for today's date", () => {
      expect(isTaskPast({ type: "date", value: "2026-06-17" })).toBe(false);
    });

    it("returns false for a future date", () => {
      expect(isTaskPast({ type: "date", value: "2026-06-18" })).toBe(false);
    });

    it("returns false for recurring types", () => {
      expect(isTaskPast({ type: "day_of_week", value: ["Mon"] })).toBe(false);
      expect(isTaskPast({ type: "day_of_month", value: [1] })).toBe(false);
      expect(isTaskPast({ type: "day_of_year", value: "1/1/2020" })).toBe(
        false,
      );
    });
  });

  describe("isPushedLater", () => {
    it("returns true when a one-time date moves later", () => {
      expect(
        isPushedLater(
          { type: "date", value: "2026-07-20" },
          { type: "date", value: "2026-07-25" },
        ),
      ).toBe(true);
    });

    it("returns false when a date moves earlier or is unchanged", () => {
      expect(
        isPushedLater(
          { type: "date", value: "2026-07-20" },
          { type: "date", value: "2026-07-15" },
        ),
      ).toBe(false);
      expect(
        isPushedLater(
          { type: "date", value: "2026-07-20" },
          { type: "date", value: "2026-07-20" },
        ),
      ).toBe(false);
    });

    it("returns false when either side is null", () => {
      expect(isPushedLater(null, { type: "date", value: "2026-07-25" })).toBe(
        false,
      );
      expect(isPushedLater({ type: "date", value: "2026-07-20" }, null)).toBe(
        false,
      );
    });

    it("returns false when either side is not a one-time date", () => {
      expect(
        isPushedLater(
          { type: "day_of_week", value: ["Mon"] },
          { type: "date", value: "2026-07-25" },
        ),
      ).toBe(false);
      expect(
        isPushedLater(
          { type: "date", value: "2026-07-20" },
          { type: "day_of_week", value: ["Mon"] },
        ),
      ).toBe(false);
    });
  });

  describe("getEcdDateKey", () => {
    it("returns null for null ecd", () => {
      expect(getEcdDateKey(null)).toBe(null);
    });

    it("returns the value as-is for date type", () => {
      expect(getEcdDateKey({ type: "date", value: "2026-06-26" })).toBe(
        "2026-06-26",
      );
    });

    it("converts day_of_year D/M/YYYY to zero-padded YYYY-MM-DD", () => {
      expect(getEcdDateKey({ type: "day_of_year", value: "7/3/2026" })).toBe(
        "2026-03-07",
      );
      expect(getEcdDateKey({ type: "day_of_year", value: "25/12/2026" })).toBe(
        "2026-12-25",
      );
    });

    it("returns today's key for day_of_week when due today, null otherwise", () => {
      expect(getEcdDateKey({ type: "day_of_week", value: ["Wed"] })).toBe(
        "2026-06-17",
      );
      expect(getEcdDateKey({ type: "day_of_week", value: ["Mon"] })).toBe(
        null,
      );
    });

    it("returns today's key for day_of_month when due today, null otherwise", () => {
      expect(getEcdDateKey({ type: "day_of_month", value: [17] })).toBe(
        "2026-06-17",
      );
      expect(getEcdDateKey({ type: "day_of_month", value: [16] })).toBe(null);
    });
  });

  describe("formatDateKey", () => {
    it("formats a YYYY-MM-DD key into a readable heading", () => {
      expect(formatDateKey("2026-06-26")).toBe("Fri, Jun 26, 2026");
    });
  });

  describe("isValidYearDate", () => {
    it("returns true for a valid D/M/YYYY value", () => {
      expect(isValidYearDate("25/12/2026")).toBe(true);
    });

    it("returns false for YYYY-MM-DD format", () => {
      expect(isValidYearDate("2026-12-25")).toBe(false);
    });

    it("returns true for out-of-range day numbers (format-only check)", () => {
      expect(isValidYearDate("32/1/2026")).toBe(true);
    });

    it("returns false for an empty string", () => {
      expect(isValidYearDate("")).toBe(false);
    });
  });

  describe("buildEcdFromInputs", () => {
    const base = {
      dateVal: "",
      dowVal: [] as string[],
      domVal: [] as number[],
      yearVal: "",
    };

    it("returns null ecd and no error for none mode", () => {
      expect(buildEcdFromInputs({ ...base, mode: "none" })).toEqual({
        ecd: null,
        error: null,
      });
    });

    it("returns a date ecd for a valid YYYY-MM-DD value", () => {
      expect(
        buildEcdFromInputs({ ...base, mode: "date", dateVal: "2026-06-26" }),
      ).toEqual({
        ecd: { type: "date", value: "2026-06-26" },
        error: null,
      });
    });

    it("returns an error for an invalid date value", () => {
      expect(
        buildEcdFromInputs({ ...base, mode: "date", dateVal: "26/06/2026" }),
      ).toEqual({
        ecd: null,
        error: "Date must use YYYY-MM-DD format.",
      });
    });

    it("returns a day_of_week ecd for valid weekday values", () => {
      expect(
        buildEcdFromInputs({ ...base, mode: "week", dowVal: ["Mon", "Wed"] }),
      ).toEqual({
        ecd: { type: "day_of_week", value: ["Mon", "Wed"] },
        error: null,
      });
    });

    it("returns an error when week mode has no weekdays selected", () => {
      expect(buildEcdFromInputs({ ...base, mode: "week" })).toEqual({
        ecd: null,
        error: "Select at least one weekday.",
      });
    });

    it("returns an error when week mode has an invalid weekday", () => {
      expect(
        buildEcdFromInputs({ ...base, mode: "week", dowVal: ["Monday"] }),
      ).toEqual({
        ecd: null,
        error: "Weekdays must be Mon-Sun abbreviations.",
      });
    });

    it("returns a day_of_month ecd for valid day numbers", () => {
      expect(
        buildEcdFromInputs({ ...base, mode: "month", domVal: [1, 15, 31] }),
      ).toEqual({
        ecd: { type: "day_of_month", value: [1, 15, 31] },
        error: null,
      });
    });

    it("returns an error when month mode has no days", () => {
      expect(buildEcdFromInputs({ ...base, mode: "month" })).toEqual({
        ecd: null,
        error: "Monthly dates must be numbers from 1 to 31.",
      });
    });

    it("returns an error when month mode has out-of-range days", () => {
      expect(
        buildEcdFromInputs({ ...base, mode: "month", domVal: [0] }),
      ).toEqual({
        ecd: null,
        error: "Monthly dates must be numbers from 1 to 31.",
      });
      expect(
        buildEcdFromInputs({ ...base, mode: "month", domVal: [32] }),
      ).toEqual({
        ecd: null,
        error: "Monthly dates must be numbers from 1 to 31.",
      });
    });

    it("returns a day_of_year ecd for a valid trimmed D/M/YYYY value", () => {
      expect(
        buildEcdFromInputs({ ...base, mode: "year", yearVal: " 25/12/2026 " }),
      ).toEqual({
        ecd: { type: "day_of_year", value: "25/12/2026" },
        error: null,
      });
    });

    it("returns an error for an invalid yearly date value", () => {
      expect(
        buildEcdFromInputs({ ...base, mode: "year", yearVal: "2026-12-25" }),
      ).toEqual({
        ecd: null,
        error: "Yearly date must use D/M/YYYY format.",
      });
    });
  });
});
