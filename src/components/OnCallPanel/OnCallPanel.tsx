import { useState, useEffect, useCallback } from "react";
import type { OnCallShift } from "../../types";
import * as onCallApi from "../../api/oncall";
import { OnCallModal } from "../OnCallModal";
import type { OnCallDraft } from "../OnCallModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
import { addDaysToDateKey, formatDateKey, todayDateKey } from "../../utils/ecd";
import {
  MINUTES_PER_DAY,
  dateKeyOf,
  formatDuration,
  isActive,
  isOvernight,
  shiftMinutes,
  upcomingShifts,
  weekSegments,
  weekStartKey,
  weekTotals,
} from "../../utils/oncall";
import "./OnCallPanel.css";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-11-09" → "Nov 9", parsed by component (never `new Date(key)`). */
function shortDay(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

const pct = (minutes: number) => `${(minutes / MINUTES_PER_DAY) * 100}%`;

interface OnCallPanelProps {
  /** Called after any change, so the app-wide "on call now" banner refreshes. */
  onShiftsChanged: () => void | Promise<void>;
}

/**
 * On-call view (option B): a week timeline of shift bars over a list of
 * upcoming shifts.
 *
 * On-call is a record kept apart from the todo — nothing here touches tasks.
 * Primary shifts are solid red, secondary ones a dashed outline in the same
 * red family. Ended shifts are hidden on the local clock the moment they end;
 * the backend cron deletes them overnight.
 */
export default function OnCallPanel({ onShiftsChanged }: OnCallPanelProps) {
  const [shifts, setShifts] = useState<OnCallShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() =>
    weekStartKey(todayDateKey()),
  );
  const [modalState, setModalState] = useState<{
    mode: "add" | "edit";
    shift?: OnCallShift;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnCallShift | null>(null);

  const load = useCallback(async () => {
    setShifts(await onCallApi.getAll());
  }, []);

  useEffect(() => {
    onCallApi.getAll().then(
      (all) => {
        setShifts(all);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  // A shift drops off the list the minute it ends, and the "now" line moves.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── CRUD (no optimistic updates: mutate via API, then refetch) ── */

  const handleSave = async (draft: OnCallDraft) => {
    if (!modalState) return;
    try {
      if (modalState.mode === "add") {
        await onCallApi.create(draft);
      } else {
        await onCallApi.update(modalState.shift!._id, draft);
      }
      await load();
      setModalState(null);
      setError(null);
      await onShiftsChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onCallApi.remove(deleteTarget._id);
      await load();
      setDeleteTarget(null);
      setError(null);
      await onShiftsChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="oncall-panel">
        <p className="empty-message">Loading on-call shifts…</p>
      </div>
    );
  }

  const today = dateKeyOf(now);
  const upcoming = upcomingShifts(shifts, now);
  const days = weekSegments(upcoming, weekStart);
  const totals = weekTotals(upcoming, weekStart);
  const weekEnd = addDaysToDateKey(weekStart, 6);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const thisWeek = weekStartKey(today);

  return (
    <div className="oncall-panel">
      {error && <p className="empty-message">Action failed: {error}</p>}

      <div className="oncall-panel__toolbar">
        <div className="oncall-panel__week-nav">
          <button
            className="oncall-panel__nav-btn"
            onClick={() => setWeekStart(addDaysToDateKey(weekStart, -7))}
            aria-label="Previous week"
            disabled={weekStart <= thisWeek}
          >
            ‹
          </button>
          <span className="oncall-panel__week-label">
            {shortDay(weekStart)} – {shortDay(weekEnd)}
          </span>
          <button
            className="oncall-panel__nav-btn"
            onClick={() => setWeekStart(addDaysToDateKey(weekStart, 7))}
            aria-label="Next week"
          >
            ›
          </button>
          <span className="oncall-panel__totals">
            · {formatDuration(totals.primary)} primary
            {totals.secondary > 0 &&
              ` · ${formatDuration(totals.secondary)} secondary`}
          </span>
        </div>
        <AddButton
          ariaLabel="Add on-call shift"
          onClick={() => setModalState({ mode: "add" })}
        />
      </div>

      <div className="oncall-panel__week" aria-label="On-call week timeline">
        {days.map((day, i) => {
          const isToday = day.date === today;
          return (
            <div className="oncall-panel__day" key={day.date}>
              <span
                className={`oncall-panel__day-label${isToday ? " oncall-panel__day-label--today" : ""}`}
              >
                {DOW[i]} {Number(day.date.slice(8))}
              </span>
              <div className="oncall-panel__track">
                {day.segments.map((seg) => (
                  <div
                    key={`${seg.shift._id}-${seg.part}`}
                    className={`oncall-panel__bar oncall-panel__bar--${seg.shift.type}`}
                    style={{
                      left: pct(seg.from),
                      width: pct(seg.to - seg.from),
                    }}
                    title={`${seg.shift.type} · ${seg.shift.start}–${seg.shift.end}`}
                  >
                    {seg.part === "start"
                      ? `${seg.shift.start} →`
                      : seg.part === "end"
                        ? `→ ${seg.shift.end}`
                        : `${seg.shift.start}–${seg.shift.end}`}
                    {seg.shift.type === "secondary" && seg.part !== "end"
                      ? " secondary"
                      : ""}
                  </div>
                ))}
                {isToday && (
                  <div
                    className="oncall-panel__now"
                    style={{ left: pct(nowMinutes) }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="oncall-panel__axis" aria-hidden="true">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <div className="oncall-panel__legend">
        <span>
          <span className="oncall-panel__swatch oncall-panel__swatch--primary" />
          Primary
        </span>
        <span>
          <span className="oncall-panel__swatch oncall-panel__swatch--secondary" />
          Secondary
        </span>
      </div>

      {upcoming.length === 0 ? (
        <p className="empty-message">
          No upcoming on-call shifts — add one! Type the shorthand you already
          use, like 11/16 9-22. On-call is kept separate and never changes your
          tasks.
        </p>
      ) : (
        <ul className="oncall-panel__list">
          {upcoming.map((shift) => {
            const active = isActive(shift, now);
            return (
              <li
                key={shift._id}
                className={`oncall-panel__row oncall-panel__row--${shift.type}`}
              >
                <div className="oncall-panel__main">
                  <span className="oncall-panel__times">
                    {shift.start} – {shift.end}
                    {isOvernight(shift) && (
                      <span className="oncall-panel__plus1"> +1</span>
                    )}
                    {shift.type === "secondary" && (
                      <span className="oncall-panel__pill">secondary</span>
                    )}
                    {active && (
                      <span className="oncall-panel__pill oncall-panel__pill--now">
                        now
                      </span>
                    )}
                  </span>
                  <span className="oncall-panel__meta">
                    {shift.date === today ? "Today · " : ""}
                    {formatDateKey(shift.date)} ·{" "}
                    {formatDuration(shiftMinutes(shift))}
                    {shift.note ? ` · ${shift.note}` : ""}
                  </span>
                </div>
                <button
                  className="oncall-panel__icon-btn"
                  onClick={() => setModalState({ mode: "edit", shift })}
                  aria-label={`Edit on-call shift ${shift.date} ${shift.start}`}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  className="oncall-panel__icon-btn oncall-panel__icon-btn--danger"
                  onClick={() => setDeleteTarget(shift)}
                  aria-label={`Delete on-call shift ${shift.date} ${shift.start}`}
                  title="Delete"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {modalState && (
        <OnCallModal
          shift={modalState.shift}
          onConfirm={handleSave}
          onCancel={() => setModalState(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete the ${deleteTarget.type} on-call shift on ${formatDateKey(deleteTarget.date)} (${deleteTarget.start}–${deleteTarget.end})?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
