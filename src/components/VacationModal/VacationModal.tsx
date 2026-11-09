import { useState, useRef, useEffect } from "react";
import type { Vacation } from "../../types";
import { EcdCalendar } from "../DatePicker";
import { Modal } from "../Modal";
import "./VacationModal.css";

interface VacationModalProps {
  vacation?: Vacation; // If provided, we're editing; otherwise booking
  onConfirm: (draft: {
    startDate: string;
    endDate: string;
    note: string;
  }) => void;
  onCancel: () => void;
}

/** Today as "YYYY-MM-DD", built by component so it can't shift a day across timezones. */
function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Book or correct a vacation.
 *
 * Two calendars rather than a toggle, because **both dates are mandatory**:
 * that is what lets a trip be booked months ahead, which is the case that
 * actually needs planning. Coming home early, or forgetting to book it on the
 * first morning, are both edits to a stored range rather than a different
 * state the app has to carry everywhere.
 */
export default function VacationModal({
  vacation,
  onConfirm,
  onCancel,
}: VacationModalProps) {
  const [startDate, setStartDate] = useState(vacation?.startDate ?? todayKey());
  const [endDate, setEndDate] = useState(vacation?.endDate ?? todayKey());
  const [note, setNote] = useState(vacation?.note ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    noteRef.current?.focus();
  }, []);

  /** Keep the end from falling behind the start as the user picks. */
  function handleStartChange(value: string) {
    setStartDate(value);
    if (endDate < value) setEndDate(value);
  }

  function handleSubmit() {
    if (endDate < startDate) {
      setFormError("The last day can't be before the first day.");
      return;
    }
    setFormError(null);
    onConfirm({ startDate, endDate, note: note.trim() });
  }

  // Both ends count, so a same-day trip is 1 day, not 0.
  const totalDays =
    Math.round(
      (Date.parse(`${endDate}T00:00:00Z`) -
        Date.parse(`${startDate}T00:00:00Z`)) /
        86400000,
    ) + 1;

  return (
    <Modal
      onClose={onCancel}
      className="vacation-modal"
      overlayClassName="vacation-modal__overlay"
      labelledBy="vacation-modal-title"
    >
      <div>
        <h3
          id="vacation-modal-title"
          className="ui-modal__title vacation-modal__title"
        >
          {vacation ? "Edit Vacation" : "Book Vacation"}
        </h3>

        <p className="ui-modal__description vacation-modal__hint">
          Both days count — the day you leave and the day you get back are both
          vacation days.
        </p>
      </div>

      <label className="field vacation-modal__note-field">
        <span className="field__label">Note</span>
        <input
          ref={noteRef}
          className="input vacation-modal__note-input"
          type="text"
          placeholder="Note… (optional, e.g. Kerala trip)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </label>

      <div className="vacation-modal__dates">
        <div className="field vacation-modal__date-field">
          <span className="field__label vacation-modal__date-label">
            First day
          </span>
          <EcdCalendar
            mode="date"
            value={startDate}
            onChange={handleStartChange}
          />
        </div>
        <div className="field vacation-modal__date-field">
          <span className="field__label vacation-modal__date-label">
            Last day
          </span>
          <EcdCalendar mode="date" value={endDate} onChange={setEndDate} />
        </div>
      </div>

      <p
        className={`vacation-modal__summary${totalDays > 0 ? "" : " vacation-modal__summary--invalid"}`}
      >
        {totalDays > 0
          ? `${totalDays} day${totalDays === 1 ? "" : "s"} off`
          : "The last day can't be before the first day."}
      </p>

      {formError && (
        <p className="ui-modal__error vacation-modal__error">{formError}</p>
      )}

      <div className="ui-modal__actions vacation-modal__actions">
        <button
          className="btn btn--secondary vacation-modal__btn"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary vacation-modal__btn vacation-modal__btn--primary"
          onClick={handleSubmit}
          disabled={endDate < startDate}
        >
          {vacation ? "Save" : "Book"}
        </button>
      </div>
    </Modal>
  );
}
