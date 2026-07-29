import { useState, useRef, useEffect } from "react";
import type { LifeEvent } from "../../types";
import "./LifeEventModal.css";

// Max day per month (1-indexed); Feb 29 is allowed — the backend cron fires
// it on Feb 28 in non-leap years.
const MAX_DAYS_BY_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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
];

interface LifeEventModalProps {
  lifeEvent?: LifeEvent; // If provided, we're editing; otherwise creating
  onConfirm: (draft: { name: string; date: string }) => void;
  onCancel: () => void;
}

export default function LifeEventModal({
  lifeEvent,
  onConfirm,
  onCancel,
}: LifeEventModalProps) {
  // Stored dates are "D/M" strings, parsed manually (never via Date)
  const [initialDay, initialMonth] = lifeEvent
    ? lifeEvent.date.split("/").map(Number)
    : [1, 1];
  const [name, setName] = useState(lifeEvent?.name ?? "");
  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialMonth);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (nameRef.current && lifeEvent) {
      // Select all text when editing
      nameRef.current.select();
    }
  }, [lifeEvent]);

  const maxDay = MAX_DAYS_BY_MONTH[month - 1];

  function handleMonthChange(newMonth: number) {
    setMonth(newMonth);
    // Keep the day valid for the newly picked month
    setDay((d) => Math.min(d, MAX_DAYS_BY_MONTH[newMonth - 1]));
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm({ name: trimmed, date: `${day}/${month}` });
  }

  return (
    <div className="life-event-modal__overlay" onClick={onCancel}>
      <div className="life-event-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="life-event-modal__title">
          {lifeEvent ? "Edit Life Event" : "Add Life Event"}
        </h3>

        <input
          ref={nameRef}
          className="life-event-modal__name-input"
          type="text"
          placeholder="Life event… (e.g. Wife's birthday)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className="life-event-modal__date" aria-label="Annual date">
          <label className="life-event-modal__date-field">
            Month
            <select
              className="life-event-modal__select"
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
            >
              {MONTH_NAMES.map((label, idx) => (
                <option key={label} value={idx + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="life-event-modal__date-field">
            Day
            <select
              className="life-event-modal__select"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            >
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="life-event-modal__hint">
          Repeats every year — it lands in your todo on the day.
        </p>

        <div className="life-event-modal__actions">
          <button
            className="life-event-modal__btn life-event-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="life-event-modal__btn life-event-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {lifeEvent ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
