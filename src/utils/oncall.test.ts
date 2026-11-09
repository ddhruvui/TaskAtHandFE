import { describe, expect, it } from "vitest";
import {
  activeShift,
  formatDuration,
  isActive,
  isEnded,
  isOvernight,
  minutesLeft,
  parseQuickAdd,
  shiftEnd,
  shiftMinutes,
  upcomingShifts,
  weekSegments,
  weekStartKey,
  weekTotals,
} from "./oncall";

// Mon Nov 9 2026, 17:48 local — the date the design mockups use.
const NOW = new Date(2026, 10, 9, 17, 48);

const shift = (
  date: string,
  start: string,
  end: string,
  type: "primary" | "secondary" = "primary",
) => ({ _id: `${date}-${start}`, date, start, end, type });

describe("shift arithmetic", () => {
  it("measures same-day, overnight, end-of-day and empty shifts", () => {
    expect(shiftMinutes({ start: "09:00", end: "22:00" })).toBe(780);
    expect(shiftMinutes({ start: "22:00", end: "06:00" })).toBe(480);
    expect(shiftMinutes({ start: "09:00", end: "24:00" })).toBe(900);
    expect(shiftMinutes({ start: "09:00", end: "09:00" })).toBe(0);
  });

  it("flags overnight shifts but not ones ending at 24:00", () => {
    expect(isOvernight({ start: "22:00", end: "06:00" })).toBe(true);
    expect(isOvernight({ start: "09:00", end: "24:00" })).toBe(false);
  });

  it("puts an overnight shift's end on the next local day", () => {
    const end = shiftEnd(shift("2026-11-12", "22:00", "06:00"));
    expect([end.getDate(), end.getHours()]).toEqual([13, 6]);
  });

  it("knows when a shift is running and when it has ended", () => {
    const today = shift("2026-11-09", "09:00", "22:00");
    expect(isActive(today, NOW)).toBe(true);
    expect(isEnded(today, NOW)).toBe(false);
    expect(minutesLeft(today, NOW)).toBe(252);
    expect(isEnded(shift("2026-11-09", "06:00", "09:00"), NOW)).toBe(true);
  });

  it("keeps yesterday's overnight shift until it ends", () => {
    const overnight = shift("2026-11-08", "22:00", "06:00");
    expect(isEnded(overnight, new Date(2026, 10, 9, 5, 59))).toBe(false);
    expect(isEnded(overnight, new Date(2026, 10, 9, 6, 0))).toBe(true);
  });

  it("upcomingShifts drops ended shifts and sorts by start", () => {
    const list = [
      shift("2026-11-16", "09:00", "22:00"),
      shift("2026-11-09", "06:00", "09:00"),
      shift("2026-11-12", "22:00", "06:00"),
    ];
    expect(upcomingShifts(list, NOW).map((s) => s.date)).toEqual([
      "2026-11-12",
      "2026-11-16",
    ]);
  });

  it("activeShift prefers primary when two run at once", () => {
    const list = [
      shift("2026-11-09", "17:00", "19:00", "secondary"),
      shift("2026-11-09", "09:00", "22:00", "primary"),
    ];
    expect(activeShift(list, NOW)?.type).toBe("primary");
    expect(activeShift([], NOW)).toBeNull();
  });

  it("formats durations", () => {
    expect(formatDuration(780)).toBe("13h");
    expect(formatDuration(510)).toBe("8h 30m");
    expect(formatDuration(45)).toBe("45m");
  });
});

describe("parseQuickAdd", () => {
  it("parses the user's shorthand as a primary shift", () => {
    expect(parseQuickAdd("11/16 9-22", NOW)).toEqual({
      date: "2026-11-16",
      start: "09:00",
      end: "22:00",
      type: "primary",
    });
  });

  it("accepts minutes, overnight and 24 as an end", () => {
    expect(parseQuickAdd("11/12 22:30-6", NOW)).toMatchObject({
      start: "22:30",
      end: "06:00",
    });
    expect(parseQuickAdd("11/16 9-24", NOW)?.end).toBe("24:00");
  });

  it("a trailing s / sec / secondary makes it secondary", () => {
    for (const suffix of ["s", "sec", "secondary", "S"]) {
      expect(parseQuickAdd(`11/16 9-22 ${suffix}`, NOW)?.type).toBe(
        "secondary",
      );
    }
    expect(parseQuickAdd("11/16 9-22 p", NOW)?.type).toBe("primary");
  });

  it("rolls a date before yesterday into next year, but keeps yesterday", () => {
    expect(parseQuickAdd("1/5 9-17", NOW)?.date).toBe("2027-01-05");
    expect(parseQuickAdd("11/8 22-6", NOW)?.date).toBe("2026-11-08");
    expect(parseQuickAdd("11/7 9-17", NOW)?.date).toBe("2027-11-07");
  });

  it("rejects malformed input, impossible dates and equal times", () => {
    for (const bad of [
      "",
      "11/16",
      "9-22",
      "13/1 9-22",
      "2/30 9-22",
      "11/16 24-6",
      "11/16 9-25",
      "11/16 9-9",
      "11/16 9-22 x",
    ]) {
      expect(parseQuickAdd(bad, NOW)).toBeNull();
    }
  });
});

describe("week timeline", () => {
  it("weeks start on Monday", () => {
    expect(weekStartKey("2026-11-09")).toBe("2026-11-09"); // Mon
    expect(weekStartKey("2026-11-15")).toBe("2026-11-09"); // Sun
    expect(weekStartKey("2026-11-16")).toBe("2026-11-16");
  });

  it("splits an overnight shift into two bars across days", () => {
    const days = weekSegments(
      [shift("2026-11-12", "22:00", "06:00")],
      "2026-11-09",
    );
    const thu = days.find((d) => d.date === "2026-11-12")!;
    const fri = days.find((d) => d.date === "2026-11-13")!;
    expect(thu.segments).toMatchObject([
      { from: 1320, to: 1440, part: "start" },
    ]);
    expect(fri.segments).toMatchObject([{ from: 0, to: 360, part: "end" }]);
  });

  it("shows the tail of an overnight shift from the previous week", () => {
    const days = weekSegments(
      [shift("2026-11-15", "22:00", "06:00")],
      "2026-11-16",
    );
    expect(days[0].segments).toMatchObject([{ from: 0, to: 360, part: "end" }]);
  });

  it("totals only the minutes inside the week, per type", () => {
    const totals = weekTotals(
      [
        shift("2026-11-09", "09:00", "22:00"),
        shift("2026-11-11", "10:00", "18:00", "secondary"),
        shift("2026-11-15", "22:00", "06:00"), // only 2h fall in this week
      ],
      "2026-11-09",
    );
    expect(totals).toEqual({ primary: 780 + 120, secondary: 480 });
  });
});
