import { useState, useRef, useEffect } from "react";
import type { LifeEvent } from "../../types";
import { Modal } from "../Modal";
import { Icon } from "../Icon";
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
    <Modal
      onClose={onCancel}
      className="life-event-modal"
      overlayClassName="life-event-modal__overlay"
      labelledBy="life-event-modal-title"
    >
      <h3
        id="life-event-modal-title"
        className="ui-modal__title life-event-modal__title"
      >
        {lifeEvent ? "Edit Life Event" : "Add Life Event"}
      </h3>

      <div className="field life-event-modal__name">
        <label htmlFor="life-event-modal-name" className="field__label">
          Name
        </label>
        <input
          id="life-event-modal-name"
          ref={nameRef}
          className="input life-event-modal__name-input"
          type="text"
          placeholder="Life event… (e.g. Wife's birthday)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </div>

      <div className="life-event-modal__when">
        <div
          className="life-event-modal__date"
          role="group"
          aria-label="Annual date"
        >
          <label className="field life-event-modal__date-field life-event-modal__date-field--month">
            <span className="field__label">Month</span>
            <span className="life-event-modal__select-wrap">
              <select
                className="input life-event-modal__select"
                value={month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
              >
                {MONTH_NAMES.map((label, idx) => (
                  <option key={label} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron-down"
                size={14}
                className="life-event-modal__select-icon"
              />
            </span>
          </label>
          <label className="field life-event-modal__date-field life-event-modal__date-field--day">
            <span className="field__label">Day</span>
            <span className="life-event-modal__select-wrap">
              <select
                className="input life-event-modal__select"
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              >
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron-down"
                size={14}
                className="life-event-modal__select-icon"
              />
            </span>
          </label>
        </div>
        <p className="field__hint life-event-modal__hint">
          <Icon name="repeat" size={13} className="life-event-modal__hint-icon" />
          Repeats every year — it lands in your todo on the day.
        </p>
      </div>

      <div className="ui-modal__actions life-event-modal__actions">
        <button
          type="button"
          className="btn btn--secondary life-event-modal__btn life-event-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary life-event-modal__btn life-event-modal__btn--confirm"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {lifeEvent ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
