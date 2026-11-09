import { describe, expect, it } from "vitest";
import {
  activeShift,
  formatDuration,
  formatMoment,
  formatSpan,
  isActive,
  isEnded,
  isOvernight,
  minutesLeft,
  onCallAgenda,
  parseQuickAdd,
  shiftEnd,
  shiftMinutes,
  upcomingShifts,
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

describe("agenda wording", () => {
  it("formats spans of a day or more in days and hours", () => {
    expect(formatSpan(45)).toBe("45m");
    expect(formatSpan(780)).toBe("13h");
    expect(formatSpan(1440)).toBe("1d");
    expect(formatSpan(7 * 1440 + 11 * 60 + 25)).toBe("7d 11h");
  });

  it("words moments as Today / Tomorrow / weekday MM/DD", () => {
    expect(formatMoment(new Date(2026, 10, 9, 22, 0), NOW)).toBe("Today 22:00");
    expect(formatMoment(new Date(2026, 10, 10, 9, 0), NOW)).toBe(
      "Tomorrow 09:00",
    );
    expect(formatMoment(new Date(2026, 10, 24, 9, 0), NOW)).toBe(
      "Tue 11/24 09:00",
    );
    expect(formatMoment(new Date(2027, 0, 5, 7, 30), NOW)).toBe(
      "Tue 01/05/27 07:30",
    );
  });
});

describe("onCallAgenda", () => {
  const kinds = (items: { kind: string }[]) => items.map((i) => i.kind);

  it("is empty with nothing upcoming", () => {
    expect(onCallAgenda([shift("2026-11-08", "09:00", "17:00")], NOW)).toEqual({
      items: [],
      freeAfter: null,
    });
  });

  it("opens with 'not on call now' and shows the gap between shifts", () => {
    const { items, freeAfter } = onCallAgenda(
      [
        shift("2026-11-24", "09:00", "17:00"),
        shift("2026-11-16", "09:00", "22:00"),
      ],
      NOW,
    );
    expect(kinds(items)).toEqual(["gap", "shift", "gap", "shift"]);
    const [now, , between] = items as Extract<
      (typeof items)[number],
      { kind: "gap" }
    >[];
    expect(now).toMatchObject({ fromNow: true, from: NOW });
    expect(now.to).toEqual(new Date(2026, 10, 16, 9, 0));
    // Mon 11/16 22:00 → Tue 11/24 09:00
    expect(between).toMatchObject({ fromNow: false, minutes: 7 * 1440 + 660 });
    expect(between.from).toEqual(new Date(2026, 10, 16, 22, 0));
    expect(between.to).toEqual(new Date(2026, 10, 24, 9, 0));
    expect(freeAfter).toEqual(new Date(2026, 10, 24, 17, 0));
  });

  it("starts with the running shift, no gap, when on call now", () => {
    const { items } = onCallAgenda(
      [
        shift("2026-11-09", "09:00", "22:00"),
        shift("2026-11-10", "09:00", "22:00"),
      ],
      NOW,
    );
    expect(kinds(items)).toEqual(["shift", "gap", "shift"]);
    expect(items[1]).toMatchObject({ kind: "gap", minutes: 660 }); // 22:00 → 09:00
  });

  it("treats back-to-back and overlapping shifts as one stretch of cover", () => {
    const { items, freeAfter } = onCallAgenda(
      [
        shift("2026-11-16", "09:00", "17:00"),
        shift("2026-11-16", "17:00", "22:00", "secondary"), // back-to-back
        shift("2026-11-16", "20:00", "06:00"), // overlaps, runs overnight
        shift("2026-11-17", "06:00", "09:00", "secondary"), // back-to-back again
      ],
      NOW,
    );
    expect(kinds(items)).toEqual(["gap", "shift", "shift", "shift", "shift"]);
    expect(freeAfter).toEqual(new Date(2026, 10, 17, 9, 0));
  });

  it("measures a gap from the end of the longest cover, not the last shift", () => {
    const { items } = onCallAgenda(
      [
        shift("2026-11-16", "08:00", "20:00"),
        shift("2026-11-16", "09:00", "10:00", "secondary"), // inside the first
        shift("2026-11-17", "08:00", "12:00"),
      ],
      NOW,
    );
    expect(kinds(items)).toEqual(["gap", "shift", "shift", "gap", "shift"]);
    expect((items[3] as { from: Date }).from).toEqual(
      new Date(2026, 10, 16, 20, 0),
    );
  });
});
