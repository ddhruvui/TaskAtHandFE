import { useState, useEffect, useCallback } from "react";
import type { LifeEvent } from "../../types";
import * as lifeEventsApi from "../../api/lifeevents";
import * as tasksApi from "../../api/tasks";
import { LifeEventModal } from "../LifeEventModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
import { Icon } from "../Icon";
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
      {/* The page header (App.tsx) carries the view title; .page-actions
          lifts this "+" into that header row. */}
      <div className="lifeevents-panel__toolbar page-actions">
        <AddButton
          ariaLabel="Add life event"
          onClick={() => setModalState({ mode: "add" })}
        />
      </div>

      {error && (
        <p className="alert alert--danger lifeevents-panel__error" role="alert">
          <Icon name="alert" />
          <span>Action failed: {error}</span>
        </p>
      )}

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
                type="button"
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
                  <Icon
                    name="check"
                    size={12}
                    strokeWidth={3.5}
                    className="lifeevents-panel__check-icon"
                  />
                )}
              </button>
              <div className="lifeevents-panel__body">
                <span
                  className={`lifeevents-panel__name${event.done ? " lifeevents-panel__name--done" : ""}`}
                >
                  {event.name}
                </span>
                <span className="lifeevents-panel__meta">
                  <span className="chip chip--info lifeevents-panel__date">
                    {formatLifeEventDate(event.date)}
                  </span>
                  {event.todoTaskId && (
                    <span
                      className="chip chip--accent lifeevents-panel__intodo"
                      title="This year's task is in the todo under Events"
                    >
                      in todo
                    </span>
                  )}
                </span>
              </div>
              <div className="lifeevents-panel__actions">
                <button
                  type="button"
                  className="icon-btn lifeevents-panel__action-btn"
                  onClick={() => handleMove(event, -1)}
                  disabled={idx === 0}
                  aria-label={`Move life event ${event.name} up`}
                  title="Move up"
                >
                  <Icon name="arrow-up" size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn lifeevents-panel__action-btn"
                  onClick={() => handleMove(event, 1)}
                  disabled={idx === events.length - 1}
                  aria-label={`Move life event ${event.name} down`}
                  title="Move down"
                >
                  <Icon name="arrow-down" size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn lifeevents-panel__action-btn"
                  onClick={() =>
                    setModalState({ mode: "edit", lifeEvent: event })
                  }
                  aria-label={`Edit life event ${event.name}`}
                  title="Edit life event"
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger lifeevents-panel__action-btn"
                  onClick={() => setDeleteTarget(event)}
                  aria-label={`Delete life event ${event.name}`}
                  title="Delete life event"
                >
                  <Icon name="trash" size={15} />
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
