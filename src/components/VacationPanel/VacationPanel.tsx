import { useState, useEffect, useCallback } from "react";
import type { Vacation, VacationStatus, VacationTask } from "../../types";
import * as vacationsApi from "../../api/vacations";
import * as tasksApi from "../../api/tasks";
import { VacationModal } from "../VacationModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
import { EcdCalendar } from "../DatePicker";
import "./VacationPanel.css";

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

/**
 * "2026-09-03" → "3 Sep 2026". Parsed by component, never via `new Date(...)`,
 * which would shift a day across timezones — the same rule the rest of the app
 * follows for date strings.
 */
function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${SHORT_MONTHS[month - 1]} ${year}`;
}

/** Whole days a range covers, both ends inclusive — a one-day trip is 1. */
function lengthOf(vacation: Pick<Vacation, "startDate" | "endDate">): number {
  return (
    Math.round(
      (Date.parse(`${vacation.endDate}T00:00:00Z`) -
        Date.parse(`${vacation.startDate}T00:00:00Z`)) /
        86400000,
    ) + 1
  );
}

/** The day after a vacation ends — the sensible default when re-dating out of it. */
function dayAfter(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
}

interface VacationPanelProps {
  /** Called after a re-date, so the todo list picks up the moved task. */
  onTasksChanged: () => void | Promise<void>;
}

/**
 * Vacation view: book time off, correct a trip after the fact, and re-date the
 * tasks that fall inside one.
 *
 * The re-date list only ever offers **one-time dated tasks**, because they are
 * the only kind that can be moved — a recurring task cannot be pushed without
 * permanently rewriting its schedule, so the backend exempts those days
 * instead. Every move here is sent with `vacationMove: true`, which is what
 * stops a trip booked in advance being read as procrastination: the reschedule
 * happens before the vacation starts, so its timestamp alone proves nothing.
 */
export default function VacationPanel({ onTasksChanged }: VacationPanelProps) {
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [status, setStatus] = useState<VacationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{
    mode: "add" | "edit";
    vacation?: Vacation;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vacation | null>(null);

  /** Which vacation's task list is expanded, and what it holds. */
  const [openTasksFor, setOpenTasksFor] = useState<string | null>(null);
  const [tasks, setTasks] = useState<VacationTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  /** The task currently being re-dated, with the date the picker is showing. */
  const [redating, setRedating] = useState<{
    task: VacationTask;
    date: string;
  } | null>(null);

  const load = useCallback(async () => {
    const [all, current] = await Promise.all([
      vacationsApi.getAll(),
      vacationsApi.getStatus(),
    ]);
    setVacations(all);
    setStatus(current);
  }, []);

  useEffect(() => {
    // Initial load: setState happens in the promise callback, not the effect
    // body (keeps react-hooks/set-state-in-effect happy)
    Promise.all([vacationsApi.getAll(), vacationsApi.getStatus()]).then(
      ([all, current]) => {
        setVacations(all);
        setStatus(current);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  /* ── Vacation CRUD (no optimistic updates: mutate via API, then refetch) ── */

  const handleSave = async (draft: {
    startDate: string;
    endDate: string;
    note: string;
  }) => {
    if (!modalState) return;
    try {
      if (modalState.mode === "add") {
        await vacationsApi.create(draft);
      } else {
        await vacationsApi.update(modalState.vacation!._id, draft);
      }
      await load();
      setModalState(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await vacationsApi.remove(deleteTarget._id);
      if (openTasksFor === deleteTarget._id) setOpenTasksFor(null);
      await load();
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* ── The re-date list ── */

  const handleToggleTasks = async (vacation: Vacation) => {
    if (openTasksFor === vacation._id) {
      setOpenTasksFor(null);
      return;
    }
    setOpenTasksFor(vacation._id);
    setTasksLoading(true);
    try {
      setTasks(await vacationsApi.getTasks(vacation._id));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setTasks([]);
    }
    setTasksLoading(false);
  };

  const handleRedate = async () => {
    if (!redating || !openTasksFor) return;
    try {
      // vacationMove is the whole point of this flow: without it the backend
      // would read a planned move as an unexcused postpone.
      await tasksApi.update(redating.task._id, {
        ecd: { type: "date", value: redating.date },
        vacationMove: true,
      });
      setTasks(await vacationsApi.getTasks(openTasksFor));
      setRedating(null);
      setError(null);
      await onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="vacation-panel">
        <p className="empty-message">Loading vacations…</p>
      </div>
    );
  }

  const today = status?.today ?? "";
  const activeId = status?.active?._id ?? null;

  return (
    <div className="vacation-panel">
      {error && <p className="empty-message">Action failed: {error}</p>}

      {/* ── Status banner: the thing that stops a forgotten trip going unnoticed ── */}
      {status?.onVacation && status.active && (
        <div
          className="vacation-panel__banner vacation-panel__banner--active"
          role="status"
        >
          <strong>You're on vacation.</strong> Day {status.active.dayOfVacation}{" "}
          of {status.active.totalDays}
          {status.active.note ? ` · ${status.active.note}` : ""} — back on{" "}
          {formatDay(dayAfter(status.active.endDate))}. Missed days aren't
          counted against you, and insight reports are paused until you're back.
        </div>
      )}
      {!status?.onVacation && status?.justReturnedFrom && (
        <div className="vacation-panel__banner" role="status">
          <strong>Welcome back.</strong> You were away{" "}
          {status.justReturnedFrom.days} day
          {status.justReturnedFrom.days === 1 ? "" : "s"} — habit streaks start
          fresh from here, and your next report will have a restart plan.
        </div>
      )}

      <div className="vacation-panel__toolbar">
        <AddButton
          ariaLabel="Add vacation"
          onClick={() => setModalState({ mode: "add" })}
        />
      </div>

      {vacations.length === 0 ? (
        <p className="empty-message">
          No vacations yet — add one! Book the days you're away and anything you
          don't get done then won't count as procrastination. Streaks pause
          rather than break, and you can book a trip months ahead.
        </p>
      ) : (
        <ul className="vacation-panel__list">
          {vacations.map((vacation) => {
            const isActive = vacation._id === activeId;
            const isPast = vacation.endDate < today;
            const isOpen = openTasksFor === vacation._id;
            return (
              <li
                key={vacation._id}
                className={`vacation-panel__row${isActive ? " vacation-panel__row--active" : ""}${isPast ? " vacation-panel__row--past" : ""}`}
              >
                <div className="vacation-panel__main">
                  <span className="vacation-panel__dates">
                    {formatDay(vacation.startDate)} →{" "}
                    {formatDay(vacation.endDate)}
                  </span>
                  <span className="vacation-panel__meta">
                    {lengthOf(vacation)} day
                    {lengthOf(vacation) === 1 ? "" : "s"}
                    {isActive
                      ? " · on now"
                      : isPast
                        ? " · past"
                        : " · upcoming"}
                    {vacation.note ? ` · ${vacation.note}` : ""}
                  </span>
                </div>

                <button
                  className="vacation-panel__link-btn"
                  onClick={() => handleToggleTasks(vacation)}
                  aria-expanded={isOpen}
                  aria-label={`Tasks during ${formatDay(vacation.startDate)}`}
                >
                  {isOpen ? "Hide tasks" : "Tasks"}
                </button>
                <button
                  className="vacation-panel__icon-btn"
                  onClick={() => setModalState({ mode: "edit", vacation })}
                  aria-label={`Edit vacation ${formatDay(vacation.startDate)}`}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  className="vacation-panel__icon-btn vacation-panel__icon-btn--danger"
                  onClick={() => setDeleteTarget(vacation)}
                  aria-label={`Delete vacation ${formatDay(vacation.startDate)}`}
                  title="Delete"
                >
                  ×
                </button>

                {isOpen && (
                  <div className="vacation-panel__tasks">
                    {tasksLoading ? (
                      <p className="vacation-panel__tasks-empty">Loading…</p>
                    ) : tasks.length === 0 ? (
                      <p className="vacation-panel__tasks-empty">
                        Nothing dated inside this vacation. Repeating tasks
                        aren't listed — they can't be moved without changing
                        their schedule, so those days are simply excused.
                      </p>
                    ) : (
                      <ul className="vacation-panel__tasks-list">
                        {tasks.map((task) => (
                          <li
                            key={task._id}
                            className="vacation-panel__task-row"
                          >
                            <span className="vacation-panel__task-name">
                              {task.name}
                            </span>
                            <span className="vacation-panel__task-meta">
                              {task.headerName ?? "—"} ·{" "}
                              {task.ecd && task.ecd.type === "date"
                                ? formatDay(task.ecd.value)
                                : ""}
                            </span>
                            <button
                              className="vacation-panel__link-btn"
                              onClick={() =>
                                setRedating({
                                  task,
                                  // Default to the first day back — the answer
                                  // the user wants nine times out of ten.
                                  date: dayAfter(vacation.endDate),
                                })
                              }
                              aria-label={`Pick a new date for ${task.name}`}
                            >
                              Pick a new date
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Re-date dialog ── */}
      {redating && (
        <div
          className="vacation-modal__overlay"
          onClick={() => setRedating(null)}
        >
          <div className="vacation-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="vacation-modal__title">
              Move "{redating.task.name}"
            </h3>
            <p className="vacation-modal__hint">
              This move won't be counted as procrastination — you're away.
            </p>
            <EcdCalendar
              mode="date"
              value={redating.date}
              onChange={(date) =>
                setRedating((prev) => (prev ? { ...prev, date } : prev))
              }
            />
            <div className="vacation-modal__actions">
              <button
                className="vacation-modal__btn"
                onClick={() => setRedating(null)}
              >
                Cancel
              </button>
              <button
                className="vacation-modal__btn vacation-modal__btn--primary"
                onClick={handleRedate}
              >
                Move task
              </button>
            </div>
          </div>
        </div>
      )}

      {modalState && (
        <VacationModal
          vacation={
            modalState.mode === "edit" ? modalState.vacation : undefined
          }
          onConfirm={handleSave}
          onCancel={() => setModalState(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete the vacation from ${formatDay(deleteTarget.startDate)} to ${formatDay(deleteTarget.endDate)}? Those days will count as ordinary days again.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
