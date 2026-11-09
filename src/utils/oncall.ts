/**
 * On-call shift helpers (mirrored in Shleeji's `utils/oncall.js`).
 *
 * Everything here works in the **local** timezone: shifts are wall-clock
 * times, and "has it ended" / "is it on now" must follow the user's own clock.
 * Date keys are parsed by component, never via `new Date("YYYY-MM-DD")`.
 */

import type { OnCallShift, OnCallType } from "../types";
import { addDaysToDateKey } from "./ecd";

export const MINUTES_PER_DAY = 24 * 60;

type ShiftTimes = Pick<OnCallShift, "start" | "end">;
type ShiftWhen = Pick<OnCallShift, "date" | "start" | "end">;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:mm" (00:00–23:59) → minutes since midnight, or null. */
export function startMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Like `startMinutes`, plus "24:00" (1440). */
export function endMinutes(value: string): number | null {
  return value === "24:00" ? MINUTES_PER_DAY : startMinutes(value);
}

/** Shift length in minutes; an end at or before the start wraps past midnight. */
export function shiftMinutes(shift: ShiftTimes): number {
  const start = startMinutes(shift.start);
  const end = endMinutes(shift.end);
  if (start === null || end === null || start === end) return 0;
  return end > start ? end - start : end + MINUTES_PER_DAY - start;
}

/** Whether the shift runs into the next calendar day. */
export function isOvernight(shift: ShiftTimes): boolean {
  const start = startMinutes(shift.start) ?? 0;
  return start + shiftMinutes(shift) > MINUTES_PER_DAY;
}

/** The local Date a shift starts. */
export function shiftStart(shift: ShiftWhen): Date {
  const [y, m, d] = shift.date.split("-").map(Number);
  return new Date(y, m - 1, d, 0, startMinutes(shift.start) ?? 0);
}

/** The local Date a shift ends. */
export function shiftEnd(shift: ShiftWhen): Date {
  const start = shiftStart(shift);
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    start.getHours(),
    start.getMinutes() + shiftMinutes(shift),
  );
}

export const isEnded = (shift: ShiftWhen, now: Date): boolean =>
  shiftEnd(shift) <= now;

export const isActive = (shift: ShiftWhen, now: Date): boolean =>
  shiftStart(shift) <= now && now < shiftEnd(shift);

/** Shifts that have not ended yet, in start order. */
export function upcomingShifts<T extends ShiftWhen>(
  shifts: T[],
  now: Date,
): T[] {
  return shifts
    .filter((s) => !isEnded(s, now))
    .sort((a, b) => shiftStart(a).getTime() - shiftStart(b).getTime());
}

/** The shift running right now (primary wins a tie), or null. */
export function activeShift<T extends ShiftWhen & { type: OnCallType }>(
  shifts: T[],
  now: Date,
): T | null {
  const running = shifts.filter((s) => isActive(s, now));
  return running.find((s) => s.type === "primary") ?? running[0] ?? null;
}

/** 780 → "13h", 510 → "8h 30m", 45 → "45m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Minutes from `now` until a shift ends (floored at 0). */
export function minutesLeft(shift: ShiftWhen, now: Date): number {
  return Math.max(
    0,
    Math.floor((shiftEnd(shift).getTime() - now.getTime()) / 60000),
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes since midnight → "HH:mm" (1440 → "24:00"). */
export function toTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** A Date → its local "YYYY-MM-DD" key. */
export function dateKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface QuickShift {
  date: string;
  start: string;
  end: string;
  type: OnCallType;
}

const QUICK_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?(?:\s+(p|primary|s|sec|secondary))?$/i;

/**
 * Parse the quick-add shorthand: "11/16 9-22", "11/12 22:30-6", "11/16 9-22 s".
 *
 * Month/day with no year picks the next occurrence on or after yesterday
 * (yesterday so an overnight shift that started then can still be logged).
 * Hours are 0–24; "24" is only an end. A trailing `s`/`sec`/`secondary` makes
 * it secondary; anything else is primary.
 *
 * @returns the shift, or null when the text doesn't parse or the times are equal
 */
export function parseQuickAdd(text: string, now: Date): QuickShift | null {
  const match = QUICK_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, mo, d, sh, sm = "0", eh, em = "0", kind] = match;
  const month = Number(mo);
  const day = Number(d);
  const startH = Number(sh);
  const endH = Number(eh);
  const startM = Number(sm);
  const endM = Number(em);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (startH > 23 || startM > 59 || endM > 59) return null;
  if (endH > 24 || (endH === 24 && endM !== 0)) return null;

  const yesterday = addDaysToDateKey(dateKeyOf(now), -1);
  let year = now.getFullYear();
  let candidate = new Date(year, month - 1, day);
  if (candidate.getMonth() !== month - 1) return null; // e.g. 2/30
  if (dateKeyOf(candidate) < yesterday) {
    year += 1;
    candidate = new Date(year, month - 1, day);
    if (candidate.getMonth() !== month - 1) return null;
  }

  const start = toTime(startH * 60 + startM);
  const end = toTime(endH * 60 + endM);
  if (shiftMinutes({ start, end }) === 0) return null;

  const type: OnCallType =
    kind && kind.toLowerCase().startsWith("s") ? "secondary" : "primary";
  return { date: dateKeyOf(candidate), start, end, type };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * A long span the way people say it: under a day reads like
 * `formatDuration` ("8h 30m"), a day or more drops the minutes
 * ("2d 11h", "7d").
 */
export function formatSpan(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < MINUTES_PER_DAY) return formatDuration(total);
  const days = Math.floor(total / MINUTES_PER_DAY);
  const hours = Math.floor((total % MINUTES_PER_DAY) / 60);
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}

/**
 * A moment as the on-call agenda words it, on the local clock: "Today 22:00",
 * "Tomorrow 09:00", otherwise "Tue 11/24 09:00" — the todo's MM/DD, plus
 * "/YY" outside the current year.
 */
export function formatMoment(date: Date, now: Date): string {
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const key = dateKeyOf(date);
  const today = dateKeyOf(now);
  if (key === today) return `Today ${time}`;
  if (key === addDaysToDateKey(today, 1)) return `Tomorrow ${time}`;
  const year =
    date.getFullYear() === now.getFullYear()
      ? ""
      : `/${String(date.getFullYear()).slice(-2)}`;
  return `${WEEKDAYS[date.getDay()]} ${pad(date.getMonth() + 1)}/${pad(date.getDate())}${year} ${time}`;
}

/** A stretch with no on-call cover between two shifts (or from now). */
export interface OnCallGap {
  kind: "gap";
  from: Date;
  to: Date;
  minutes: number;
  /** The gap the user is in right now: it runs from `now`. */
  fromNow: boolean;
}

export type AgendaItem<T> = { kind: "shift"; shift: T } | OnCallGap;

/**
 * The on-call agenda: upcoming shifts in start order, with the off-call gaps
 * between them — "Not on call from Mon 11/16 22:00 to Tue 11/24 09:00"
 * instead of paging through weeks.
 *
 * Overlapping or back-to-back shifts (one ending as the next starts) are one
 * stretch of cover, so no gap opens inside it. When `now` isn't covered, the
 * agenda opens with the gap from now to the first shift (`fromNow`).
 *
 * @returns `items` in time order, and `freeAfter`: when the last stretch of
 *   cover ends (null with no upcoming shifts).
 */
export function onCallAgenda<T extends ShiftWhen>(
  shifts: T[],
  now: Date,
): { items: AgendaItem<T>[]; freeAfter: Date | null } {
  const items: AgendaItem<T>[] = [];
  let coverEnd: Date | null = null;
  for (const shift of upcomingShifts(shifts, now)) {
    const start = shiftStart(shift);
    const from: Date = coverEnd ?? now;
    if (start > from) {
      items.push({
        kind: "gap",
        from,
        to: start,
        minutes: Math.round((start.getTime() - from.getTime()) / 60000),
        fromNow: coverEnd === null,
      });
    }
    items.push({ kind: "shift", shift });
    const end = shiftEnd(shift);
    if (!coverEnd || end > coverEnd) coverEnd = end;
  }
  return { items, freeAfter: coverEnd };
}
