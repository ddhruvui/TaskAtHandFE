import { useState, useMemo } from "react";
import "./EcdCalendar.css";

interface EcdCalendarProps {
  /** "date" = full date (YYYY-MM-DD), "year" = day-of-year (D/M/YYYY) */
  mode: "date" | "year";
  /** Currently selected value – YYYY-MM-DD for date, D/M/YYYY for year */
  value: string;
  onChange: (value: string) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseInitial(
  mode: "date" | "year",
  value: string,
): { month: number; year: number } {
  const now = new Date();
  if (mode === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    return { month: m - 1, year: y };
  }
  if (mode === "year" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [, m] = value.split("/").map(Number);
    return { month: m - 1, year: now.getFullYear() };
  }
  return { month: now.getMonth(), year: now.getFullYear() };
}

function selectedDay(
  mode: "date" | "year",
  value: string,
  viewMonth: number,
  viewYear: number,
): number | null {
  if (mode === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    if (y === viewYear && m - 1 === viewMonth) return d;
  }
  if (mode === "year" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [d, m] = value.split("/").map(Number);
    if (m - 1 === viewMonth) return d;
  }
  return null;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Mon … 6 = Sun (ISO weekday) */
function startDayOfWeek(month: number, year: number): number {
  const d = new Date(year, month, 1).getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;
}

function isToday(day: number, month: number, year: number): boolean {
  const n = new Date();
  return (
    n.getDate() === day && n.getMonth() === month && n.getFullYear() === year
  );
}

export default function EcdCalendar({
  mode,
  value,
  onChange,
}: EcdCalendarProps) {
  const init = parseInitial(mode, value);
  const [viewMonth, setViewMonth] = useState(init.month);
  const [viewYear, setViewYear] = useState(init.year);

  const totalDays = daysInMonth(viewMonth, viewYear);
  const startOffset = startDayOfWeek(viewMonth, viewYear);
  const sel = selectedDay(mode, value, viewMonth, viewYear);

  const cells = useMemo(() => {
    const blanks = Array.from({ length: startOffset }, (_, i) => ({
      key: `b${i}`,
      day: 0,
    }));
    const days = Array.from({ length: totalDays }, (_, i) => ({
      key: `d${i + 1}`,
      day: i + 1,
    }));
    return [...blanks, ...days];
  }, [startOffset, totalDays]);

  function prevMonth() {
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    setViewMonth(newMonth);
    setViewYear(newYear);
  }

  function nextMonth() {
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    setViewMonth(newMonth);
    setViewYear(newYear);
  }

  function handleSelect(day: number) {
    if (mode === "date") {
      const mm = String(viewMonth + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      onChange(`${viewYear}-${mm}-${dd}`);
    } else {
      onChange(`${day}/${viewMonth + 1}/${viewYear}`);
    }
  }

  return (
    <div className="ecd-calendar">
      <div className="ecd-calendar__header">
        <button
          type="button"
          className="ecd-calendar__nav"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="ecd-calendar__month-label">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          className="ecd-calendar__nav"
          onClick={nextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="ecd-calendar__grid">
        {DAY_HEADERS.map((dh) => (
          <span key={dh} className="ecd-calendar__day-header">
            {dh}
          </span>
        ))}
        {cells.map((c) =>
          c.day === 0 ? (
            <span key={c.key} className="ecd-calendar__blank" />
          ) : (
            <button
              key={c.key}
              type="button"
              className={[
                "ecd-calendar__day",
                sel === c.day ? "ecd-calendar__day--selected" : "",
                isToday(c.day, viewMonth, viewYear)
                  ? "ecd-calendar__day--today"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleSelect(c.day)}
            >
              {c.day}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
