import { useState, useEffect, useCallback } from "react";
import type { LifeEvent } from "../../types";
import * as lifeEventsApi from "../../api/lifeevents";
import * as tasksApi from "../../api/tasks";
import { LifeEventModal } from "../LifeEventModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
import "./LifeEventsPanel.css";

/**
 * "7/3" → "↻ 7 Mar" — the recurring marker matches the todo's recurring-ECD
 * display; dates are parsed manually (never via Date) for timezone safety.
 */
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

function formatLifeEventDate(date: string): string {
  const [day, month] = date.split("/").map(Number);
  return `↻ ${day} ${SHORT_MONTHS[month - 1]}`;
}

interface LifeEventsPanelProps {
  /** Called after a change here also touched the todo (linked task synced). */
  onTasksChanged: () => void | Promise<void>;
}

export default function LifeEventsPanel({
  onTasksChanged,
}: LifeEventsPanelProps) {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [modalState, setModalState] = useState<{
    mode: "add" | "edit";
    lifeEvent?: LifeEvent;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LifeEvent | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const all = await lifeEventsApi.getAll();
      setEvents(all);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load: setState happens in the promise callback, not the
    // effect body (keeps react-hooks/set-state-in-effect happy)
    lifeEventsApi.getAll().then(
      (all) => {
        setEvents(all);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  /* ── Life event CRUD (no optimistic updates: mutate via API, then refetch) ── */

  const handleSaveEvent = async (draft: { name: string; date: string }) => {
    if (!modalState) return;
    try {
      if (modalState.mode === "add") {
        await lifeEventsApi.create({ name: draft.name, date: draft.date });
      } else {
        const current = modalState.lifeEvent!;
        await lifeEventsApi.update(current._id, {
          name: draft.name,
          date: draft.date,
        });
        // A rename mirrors onto the linked todo task (the task's date is this
        // year's occurrence — moving the anniversary doesn't reschedule it)
        if (current.todoTaskId && draft.name !== current.name) {
          await tasksApi.update(current.todoTaskId, { name: draft.name });
          await onTasksChanged();
        }
      }
      await loadEvents();
      setModalState(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleDone = async (event: LifeEvent) => {
    try {
      await lifeEventsApi.update(event._id, { done: !event.done });
      // Mirror onto the linked todo task while one exists
      if (event.todoTaskId) {
        await tasksApi.update(event.todoTaskId, { done: !event.done });
        await onTasksChanged();
      }
      await loadEvents();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMove = async (event: LifeEvent, delta: -1 | 1) => {
    try {
      await lifeEventsApi.update(event._id, {
        priority: event.priority + delta,
      });
      await loadEvents();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    try {
      // The todo task created for this year (if any) is deliberately kept
      await lifeEventsApi.remove(deleteTarget._id);
      await loadEvents();
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="lifeevents-panel">
        <p className="empty-message">Loading life events…</p>
      </div>
    );
  }

  return (
    <div className="lifeevents-panel">
      {error && <p className="empty-message">Action failed: {error}</p>}

      <div className="lifeevents-panel__toolbar">
        <AddButton
          label="Add Life Event"
          ariaLabel="Add life event"
          onClick={() => setModalState({ mode: "add" })}
        />
      </div>

      {events.length === 0 ? (
        <p className="empty-message">
          No life events yet — add one! A life event is a date that repeats
          every year (like a birthday); it lands in your todo on the day.
        </p>
      ) : (
        <ul className="lifeevents-panel__list">
          {events.map((event, idx) => (
            <li
              key={event._id}
              className={`lifeevents-panel__row${event.done ? " lifeevents-panel__row--done" : ""}`}
            >
              <button
                className={`lifeevents-panel__checkbox${event.done ? " lifeevents-panel__checkbox--checked" : ""}`}
                onClick={() => handleToggleDone(event)}
                aria-label={
                  event.done
                    ? `Mark ${event.name} as not done`
                    : `Mark ${event.name} as done`
                }
                title={
                  event.done
                    ? "Mark this year's occurrence as not done"
                    : "Mark this year's occurrence as done"
                }
              >
                {event.done && (
                  <svg
                    viewBox="0 0 16 16"
                    className="lifeevents-panel__check-icon"
                  >
                    <path
                      fillRule="evenodd"
                      d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`lifeevents-panel__name${event.done ? " lifeevents-panel__name--done" : ""}`}
              >
                {event.name}
              </span>
              <span className="lifeevents-panel__date">
                {formatLifeEventDate(event.date)}
              </span>
              {event.todoTaskId && (
                <span
                  className="lifeevents-panel__intodo"
                  title="This year's task is in the todo under Events"
                >
                  in todo
                </span>
              )}
              <div className="lifeevents-panel__actions">
                <button
                  className="readme-heading__add-btn"
                  onClick={() => handleMove(event, -1)}
                  disabled={idx === 0}
                  aria-label={`Move life event ${event.name} up`}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="readme-heading__add-btn"
                  onClick={() => handleMove(event, 1)}
                  disabled={idx === events.length - 1}
                  aria-label={`Move life event ${event.name} down`}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  className="readme-heading__add-btn"
                  onClick={() =>
                    setModalState({ mode: "edit", lifeEvent: event })
                  }
                  aria-label={`Edit life event ${event.name}`}
                  title="Edit life event"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286z"
                    />
                  </svg>
                </button>
                <button
                  className="readme-heading__add-btn"
                  onClick={() => setDeleteTarget(event)}
                  aria-label={`Delete life event ${event.name}`}
                  title="Delete life event"
                  style={{ color: "#e74c3c" }}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 1 0-1.492.141l.6 6.35A1.5 1.5 0 0 0 5.1 14.4h5.8a1.5 1.5 0 0 0 1.496-1.35l.6-6.35a.75.75 0 1 0-1.492-.141l-.6 6.33a.008.008 0 0 1-.007.011H5.104a.008.008 0 0 1-.007-.01l-.6-6.332z"
                    />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modals */}
      {modalState && (
        <LifeEventModal
          lifeEvent={
            modalState.mode === "edit" ? modalState.lifeEvent : undefined
          }
          onConfirm={handleSaveEvent}
          onCancel={() => setModalState(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete life event "${deleteTarget.name}"? It will no longer be added to your todo each year (this year's task, if already added, stays).`}
          onConfirm={handleDeleteEvent}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
