import { useState, useEffect, useCallback } from "react";
import type { EventTemplate } from "../../types";
import * as eventsApi from "../../api/events";
import * as headersApi from "../../api/headers";
import * as tasksApi from "../../api/tasks";
import { EventModal } from "../EventModal";
import { ScheduleEventModal } from "../ScheduleEventModal";
import { ConfirmModal } from "../ConfirmModal";
import { formatDateKey } from "../../utils/ecd";
import "./EventsPanel.css";

interface EventsPanelProps {
  /** Called after event tasks have been added to the todo, so the todo list can reload. */
  onTasksAdded: () => void;
}

export default function EventsPanel({ onTasksAdded }: EventsPanelProps) {
  const [events, setEvents] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    loadEvents();
  }, [loadEvents]);

  /* ── Event CRUD ── */

  const handleSaveEvent = async (draft: { name: string; tasks: string[] }) => {
    if (!eventModalState) return;
    try {
      if (eventModalState.mode === "add") {
        await eventsApi.create(draft);
      } else {
        await eventsApi.update(eventModalState.event!._id, draft);
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
        `Added ${draft.tasks.length} task${draft.tasks.length === 1 ? "" : "s"} under "${event.name}" for ${formatDateKey(draft.date)}.`,
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
      {error && <p className="empty-message">Action failed: {error}</p>}
      {notice && (
        <p className="events-panel__notice">
          {notice}{" "}
          <button
            className="events-panel__notice-dismiss"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </p>
      )}

      <div className="events-panel__toolbar">
        <button
          className="readme-heading__add-btn events-panel__add-event-btn"
          onClick={() => setEventModalState({ mode: "add" })}
          aria-label="Add event"
          title="Add event"
        >
          <span style={{ marginRight: "6px" }}>+</span> Add Event
        </button>
      </div>

      {events.map((event) => (
        <section key={event._id} className="readme-section">
          <div className="readme-heading">
            <h2 className="readme-heading__text">{event.name}</h2>

            <button
              className="readme-heading__add-btn"
              onClick={() =>
                setEventModalState({ mode: "edit", event })
              }
              aria-label={`Edit event ${event.name}`}
              title="Edit event"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286z"
                />
              </svg>
            </button>
            <button
              className="readme-heading__add-btn"
              onClick={() => setDeleteTarget(event)}
              aria-label={`Delete event ${event.name}`}
              title="Delete event"
              style={{ color: "#e74c3c" }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 1 0-1.492.141l.6 6.35A1.5 1.5 0 0 0 5.1 14.4h5.8a1.5 1.5 0 0 0 1.496-1.35l.6-6.35a.75.75 0 1 0-1.492-.141l-.6 6.33a.008.008 0 0 1-.007.011H5.104a.008.008 0 0 1-.007-.01l-.6-6.332z"
                />
              </svg>
            </button>
            <button
              className="readme-heading__add-btn events-panel__schedule-btn"
              onClick={() => setScheduleState({ event })}
              aria-label={`Add ${event.name} to todo`}
              title="Add to todo"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z" />
              </svg>
              <span className="events-panel__schedule-btn-label">
                Add to todo
              </span>
            </button>
          </div>

          <ul className="events-panel__task-list">
            {event.tasks.map((task, i) => (
              <li key={i} className="events-panel__task-row">
                <span className="events-panel__task-name">{task}</span>
                <button
                  className="events-panel__task-add-btn"
                  onClick={() =>
                    setScheduleState({ event, initialSelected: [task] })
                  }
                  aria-label={`Add "${task}" to todo`}
                  title="Add this task to todo"
                >
                  +
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

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
