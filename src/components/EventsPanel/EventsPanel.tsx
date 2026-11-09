import { useState, useEffect, useCallback } from "react";
import type { EventTemplate } from "../../types";
import * as eventsApi from "../../api/events";
import * as headersApi from "../../api/headers";
import * as tasksApi from "../../api/tasks";
import { EventModal } from "../EventModal";
import { ScheduleEventModal } from "../ScheduleEventModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
import { Icon } from "../Icon";
import { formatDateKey } from "../../utils/ecd";
import "./EventsPanel.css";

interface EventsPanelProps {
  /** Called after event tasks have been added to the todo, so the todo list can reload. */
  onTasksAdded: () => void;
  /** Leaves the Events view for the todo list (the notice's "View in todo"). */
  onViewTodo?: () => void;
}

const taskCountLabel = (n: number) => `${n} task${n === 1 ? "" : "s"}`;

export default function EventsPanel({
  onTasksAdded,
  onViewTodo,
}: EventsPanelProps) {
  const [events, setEvents] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Ids of the events whose task list is open. The first event starts open. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modal states
  const [eventModalState, setEventModalState] = useState<{
    mode: "add" | "edit";
    event?: EventTemplate;
  } | null>(null);
  const [scheduleState, setScheduleState] = useState<{
    event: EventTemplate;
    initialSelected?: string[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventTemplate | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const all = await eventsApi.getAll();
      setEvents(all);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load: setState happens in the promise callback, not the
    // effect body (keeps react-hooks/set-state-in-effect happy). The first
    // event starts expanded.
    let cancelled = false;
    eventsApi.getAll().then(
      (all) => {
        if (cancelled) return;
        setEvents(all);
        // Only seed when nothing is open yet, so a late response never
        // collapses what the user already expanded
        if (all.length > 0)
          setExpanded((prev) => (prev.size > 0 ? prev : new Set([all[0]._id])));
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const expand = (id: string) => setExpanded((prev) => new Set(prev).add(id));

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* ── Event CRUD ── */

  const handleSaveEvent = async (draft: { name: string; tasks: string[] }) => {
    if (!eventModalState) return;
    try {
      // The event just added or edited opens so its tasks are in view
      if (eventModalState.mode === "add") {
        const created = await eventsApi.create(draft);
        expand(created._id);
      } else {
        await eventsApi.update(eventModalState.event!._id, draft);
        expand(eventModalState.event!._id);
      }
      await loadEvents();
      setEventModalState(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    try {
      await eventsApi.remove(deleteTarget._id);
      setEvents((prev) => prev.filter((e) => e._id !== deleteTarget._id));
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* ── Add event tasks to the todo ──
   * Tasks land under a header named after the event — reused when one
   * already exists so later additions join it — with the chosen date as
   * their ECD. */
  const handleSchedule = async (draft: { date: string; tasks: string[] }) => {
    if (!scheduleState) return;
    const { event } = scheduleState;
    try {
      const eventKey = event.name.trim().toLowerCase();
      const existing = (await headersApi.getAll()).find(
        (h) => h.name.trim().toLowerCase() === eventKey,
      );
      const header =
        existing ?? (await headersApi.create({ name: event.name }));
      // Create sequentially so tasks keep the event's order
      for (const taskName of draft.tasks) {
        await tasksApi.create({
          name: taskName,
          headerId: header._id,
          notes: "",
          ecd: { type: "date", value: draft.date },
        });
      }
      setScheduleState(null);
      setError(null);
      setNotice(
        `Added ${taskCountLabel(draft.tasks.length)} under "${event.name}" for ${formatDateKey(draft.date)}.`,
      );
      onTasksAdded();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="events-panel">
        <p className="empty-message">Loading events…</p>
      </div>
    );
  }

  return (
    <div className="events-panel">
      {/* The page header (App.tsx) carries the view title; .page-actions
          lifts this "+" into that header row. */}
      <div className="events-panel__toolbar page-actions">
        <AddButton
          ariaLabel="Add event"
          onClick={() => setEventModalState({ mode: "add" })}
        />
      </div>

      {error && (
        <p
          className="alert alert--danger events-panel__banner events-panel__banner--error"
          role="alert"
        >
          <Icon name="alert" />
          <span className="events-panel__banner-text">
            Action failed: {error}
          </span>
        </p>
      )}
      {notice && (
        <p
          className="alert events-panel__banner events-panel__notice"
          role="status"
        >
          <Icon name="check" className="events-panel__banner-icon" />
          <span className="events-panel__banner-text">{notice}</span>
          {onViewTodo && (
            <button
              type="button"
              className="btn btn--sm btn--ghost events-panel__notice-link"
              onClick={onViewTodo}
            >
              View in todo
            </button>
          )}
          <button
            type="button"
            className="icon-btn events-panel__notice-dismiss"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            title="Dismiss"
          >
            <Icon name="x" size={14} />
          </button>
        </p>
      )}

      {events.length > 0 && (
        <div className="events-panel__list">
          {events.map((event) => {
            const isOpen = expanded.has(event._id);
            const listId = `event-tasks-${event._id}`;
            return (
              <section
                key={event._id}
                className={`readme-section events-panel__event${isOpen ? " events-panel__event--open" : ""}`}
              >
                <div className="events-panel__event-head">
                  <button
                    type="button"
                    className="events-panel__toggle"
                    onClick={() => toggleExpanded(event._id)}
                    aria-expanded={isOpen}
                    aria-controls={listId}
                  >
                    <span className="events-panel__chevron" aria-hidden="true">
                      <Icon name="chevron-right" size={16} />
                    </span>
                    <span className="events-panel__event-text">
                      <span className="events-panel__event-title">
                        <h3 className="events-panel__event-name">
                          {event.name}
                        </h3>
                        <span className="events-panel__event-count">
                          {taskCountLabel(event.tasks.length)}
                        </span>
                      </span>
                      {!isOpen && event.tasks.length > 0 && (
                        <span className="events-panel__event-preview">
                          {event.tasks.join(" · ")}
                        </span>
                      )}
                    </span>
                  </button>

                  <div className="events-panel__event-actions">
                    <div className="events-panel__event-tools">
                      <button
                        type="button"
                        className="icon-btn events-panel__icon-btn"
                        onClick={() =>
                          setEventModalState({ mode: "edit", event })
                        }
                        aria-label={`Edit event ${event.name}`}
                        title="Edit event"
                      >
                        <Icon name="pencil" size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger events-panel__icon-btn events-panel__icon-btn--danger"
                        onClick={() => setDeleteTarget(event)}
                        aria-label={`Delete event ${event.name}`}
                        title="Delete event"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn--soft btn--sm events-panel__schedule-btn"
                      onClick={() => setScheduleState({ event })}
                      aria-label={`Add ${event.name} to todo`}
                      title="Add to todo"
                    >
                      <Icon name="plus" size={14} strokeWidth={2.4} />
                      <span className="events-panel__schedule-btn-label">
                        Add to todo
                      </span>
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <ol id={listId} className="events-panel__task-list">
                    {event.tasks.map((task, i) => (
                      <li key={i} className="events-panel__task-row">
                        <span
                          className="events-panel__task-num"
                          aria-hidden="true"
                        >
                          {i + 1}
                        </span>
                        <span className="events-panel__task-name">{task}</span>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm events-panel__task-add-btn"
                          onClick={() =>
                            setScheduleState({ event, initialSelected: [task] })
                          }
                          aria-label={`Add "${task}" to todo`}
                          title="Add this task to todo"
                        >
                          <Icon name="plus" size={13} strokeWidth={2.4} />
                          Add
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}

      {events.length === 0 && (
        <p className="empty-message">
          No events yet — add one! An event is a reusable bundle of tasks (e.g.
          "Burger Night") you can drop into your todo for any date.
        </p>
      )}

      {/* Modals */}
      {eventModalState && (
        <EventModal
          event={
            eventModalState.mode === "edit" ? eventModalState.event : undefined
          }
          onConfirm={handleSaveEvent}
          onCancel={() => setEventModalState(null)}
        />
      )}

      {scheduleState && (
        <ScheduleEventModal
          event={scheduleState.event}
          initialSelected={scheduleState.initialSelected}
          onConfirm={handleSchedule}
          onCancel={() => setScheduleState(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete event "${deleteTarget.name}"? Tasks already added to the todo stay.`}
          onConfirm={handleDeleteEvent}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
