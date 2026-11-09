import { useState } from "react";
import type { EventTemplate } from "../../types";
import { addDaysToDateKey, formatDateKey, todayDateKey } from "../../utils/ecd";
import { EcdCalendar } from "../DatePicker";
import { Modal } from "../Modal";
import { Icon } from "../Icon";
import "./ScheduleEventModal.css";

/** Quick date picks above the calendar: today, tomorrow and the next
 * Saturday that is not already one of those two. */
function dateShortcuts(): { label: string; key: string }[] {
  const today = todayDateKey();
  const [y, m, d] = today.split("-").map((n) => parseInt(n, 10));
  const weekday = new Date(y, m - 1, d).getDay();
  let toSaturday = (6 - weekday + 7) % 7;
  if (toSaturday < 2) toSaturday += 7;
  return [
    { label: "Today", key: today },
    { label: "Tomorrow", key: addDaysToDateKey(today, 1) },
    { label: "Saturday", key: addDaysToDateKey(today, toSaturday) },
  ];
}

interface ScheduleEventModalProps {
  event: EventTemplate;
  /** Tasks pre-checked when the modal opens. Defaults to all of them. */
  initialSelected?: string[];
  onConfirm: (draft: { date: string; tasks: string[] }) => void;
  onCancel: () => void;
}

export default function ScheduleEventModal({
  event,
  initialSelected,
  onConfirm,
  onCancel,
}: ScheduleEventModalProps) {
  const [date, setDate] = useState(todayDateKey);
  const [shortcuts] = useState(dateShortcuts);
  // Remounts the calendar after a shortcut so it jumps to that date's month
  const [calendarKey, setCalendarKey] = useState(0);

  function pickShortcut(key: string) {
    setDate(key);
    setCalendarKey((k) => k + 1);
  }
  const [selected, setSelected] = useState<Set<number>>(() => {
    if (!initialSelected) return new Set(event.tasks.map((_, i) => i));
    return new Set(
      event.tasks
        .map((task, i) => (initialSelected.includes(task) ? i : -1))
        .filter((i) => i >= 0),
    );
  });

  const allSelected = selected.size === event.tasks.length;

  function toggleTask(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(event.tasks.map((_, i) => i)),
    );
  }

  function handleConfirm() {
    if (selected.size === 0) return;
    onConfirm({
      date,
      tasks: event.tasks.filter((_, i) => selected.has(i)),
    });
  }

  return (
    <Modal
      onClose={onCancel}
      className="schedule-modal"
      overlayClassName="schedule-modal__overlay"
      labelledBy="schedule-modal-title"
    >
      <h3
        id="schedule-modal-title"
        className="ui-modal__title schedule-modal__title"
      >
        Add to todo{" "}
        <span className="ui-modal__subtitle schedule-modal__title-event">
          — {event.name}
        </span>
      </h3>

      {/* Date */}
      <div className="schedule-modal__section">
        <span className="field__label schedule-modal__label">Date</span>
        <div className="segmented schedule-modal__shortcuts">
          {shortcuts.map((s) => {
            const active = s.key === date;
            return (
              <button
                key={s.label}
                type="button"
                className={`segmented__btn schedule-modal__shortcut${active ? " segmented__btn--active schedule-modal__shortcut--active" : ""}`}
                onClick={() => pickShortcut(s.key)}
                aria-pressed={active}
                title={formatDateKey(s.key)}
              >
                {s.label}
                <span className="schedule-modal__shortcut-date">
                  {formatDateKey(s.key)
                    .replace(/, \d{4}$/, "")
                    .replace(/^\w+, /, "")}
                </span>
              </button>
            );
          })}
        </div>
        <EcdCalendar
          key={calendarKey}
          mode="date"
          value={date}
          onChange={setDate}
        />
      </div>

      {/* Task checklist */}
      <div className="schedule-modal__section">
        <div className="schedule-modal__tasks-header">
          <span className="field__label schedule-modal__label">Tasks</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm schedule-modal__toggle-all"
            onClick={toggleAll}
          >
            {allSelected ? "Unselect all" : "Select all"}
          </button>
        </div>
        <ul className="schedule-modal__task-list">
          {event.tasks.map((task, i) => (
            <li key={i} className="schedule-modal__task-row">
              <button
                type="button"
                className={`schedule-modal__checkbox${selected.has(i) ? " schedule-modal__checkbox--checked" : ""}`}
                onClick={() => toggleTask(i)}
                aria-label={
                  selected.has(i) ? `Unmark ${task}` : `Mark ${task}`
                }
                aria-pressed={selected.has(i)}
              >
                {selected.has(i) && (
                  <Icon
                    name="check"
                    size={12}
                    strokeWidth={3.5}
                    className="schedule-modal__check-icon"
                  />
                )}
              </button>
              <span
                className={`schedule-modal__task-name${selected.has(i) ? "" : " schedule-modal__task-name--unselected"}`}
                onClick={() => toggleTask(i)}
              >
                {task}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="ui-modal__actions schedule-modal__actions">
        <button
          type="button"
          className="btn btn--secondary schedule-modal__btn schedule-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary schedule-modal__btn schedule-modal__btn--confirm"
          onClick={handleConfirm}
          disabled={selected.size === 0}
        >
          Add {selected.size} task{selected.size === 1 ? "" : "s"}
        </button>
      </div>
    </Modal>
  );
}
