import { useState, useRef, useEffect } from "react";
import type { OnCallShift, OnCallType } from "../../types";
import { EcdCalendar } from "../DatePicker";
import { Modal } from "../Modal";
import { Icon } from "../Icon";
import {
  formatDuration,
  isOvernight,
  parseQuickAdd,
  shiftMinutes,
  startMinutes,
  endMinutes,
} from "../../utils/oncall";
import { formatDateKey, todayDateKey } from "../../utils/ecd";
import "./OnCallModal.css";

export interface OnCallDraft {
  date: string;
  start: string;
  end: string;
  type: OnCallType;
  note: string;
}

interface OnCallModalProps {
  shift?: OnCallShift; // If provided, we're editing; otherwise adding
  onConfirm: (draft: OnCallDraft) => void;
  onCancel: () => void;
}

/**
 * Add or edit an on-call shift.
 *
 * The quick-add field takes the shorthand the user already writes —
 * "11/16 9-22", with a trailing "s" for secondary — and fills the fields
 * below; the fields stay editable for anything the shorthand can't say.
 * Primary is the default type because it is the one actually used.
 */
export default function OnCallModal({
  shift,
  onConfirm,
  onCancel,
}: OnCallModalProps) {
  const [quick, setQuick] = useState("");
  const [date, setDate] = useState(shift?.date ?? todayDateKey());
  const [start, setStart] = useState(shift?.start ?? "09:00");
  const [end, setEnd] = useState(shift?.end ?? "22:00");
  const [type, setType] = useState<OnCallType>(shift?.type ?? "primary");
  const [note, setNote] = useState(shift?.note ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    quickRef.current?.focus();
  }, []);

  const parsed = quick.trim() ? parseQuickAdd(quick, new Date()) : null;

  function handleQuickChange(value: string) {
    setQuick(value);
    const result = value.trim() ? parseQuickAdd(value, new Date()) : null;
    if (result) {
      setDate(result.date);
      setStart(result.start);
      setEnd(result.end);
      setType(result.type);
      setFormError(null);
    }
  }

  const timesValid = startMinutes(start) !== null && endMinutes(end) !== null;
  const minutes = timesValid ? shiftMinutes({ start, end }) : 0;

  function handleSubmit() {
    if (quick.trim() && !parsed) {
      setFormError("Use M/D start-end, like 11/16 9-22 (add s for secondary).");
      return;
    }
    if (!timesValid) {
      setFormError("Times must be HH:mm (end may be 24:00).");
      return;
    }
    if (minutes === 0) {
      setFormError("Start and end can't be the same.");
      return;
    }
    setFormError(null);
    onConfirm({ date, start, end, type, note: note.trim() });
  }

  // Enter submits from any field; Escape is handled by <Modal>.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <Modal
      onClose={onCancel}
      className="oncall-modal"
      overlayClassName="oncall-modal__overlay"
      labelledBy="oncall-modal-title"
    >
      <h3 id="oncall-modal-title" className="ui-modal__title oncall-modal__title">
        {shift ? "Edit On-call Shift" : "Add On-call Shift"}
      </h3>

      <div className="field oncall-modal__quick">
        <label className="field__label oncall-modal__label" htmlFor="oncall-modal-quick">
          Quick add
        </label>
        <input
          id="oncall-modal-quick"
          ref={quickRef}
          className="input oncall-modal__input oncall-modal__input--mono"
          type="text"
          placeholder="11/16 9-22"
          value={quick}
          onChange={(e) => handleQuickChange(e.target.value)}
          onKeyDown={onKey}
          aria-label="Quick add on-call shift"
          autoComplete="off"
          spellCheck={false}
        />
        {quick.trim() ? (
          <p
            className={`oncall-modal__preview${parsed ? "" : " oncall-modal__preview--error"}`}
          >
            <Icon name={parsed ? "check" : "alert"} size={14} />
            <span>
              {parsed
                ? `${formatDateKey(parsed.date)} · ${parsed.start} → ${parsed.end}${isOvernight(parsed) ? " (+1 day)" : ""} · ${formatDuration(shiftMinutes(parsed))} · ${parsed.type}`
                : "Use M/D start-end, like 11/16 9-22 or 11/12 22-6 (add s for secondary)"}
            </span>
          </p>
        ) : (
          <p className="field__hint oncall-modal__hint">
            Month/day and hours fill the fields below — end with “s” for a
            secondary shift.
          </p>
        )}
      </div>

      <div className="oncall-modal__fields">
        <div className="field oncall-modal__date">
          <span className="field__label oncall-modal__label">Date</span>
          <EcdCalendar mode="date" value={date} onChange={setDate} />
        </div>

        <div className="oncall-modal__times">
          <div className="field">
            <span className="field__label oncall-modal__label">Type</span>
            <div
              className="segmented oncall-modal__segmented"
              role="radiogroup"
              aria-label="Shift type"
            >
              {(["primary", "secondary"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  className={`segmented__btn oncall-modal__seg oncall-modal__seg--${t}${type === t ? " segmented__btn--active oncall-modal__seg--active" : ""}`}
                  onClick={() => setType(t)}
                >
                  <span
                    className={`oncall-modal__swatch oncall-modal__swatch--${t}`}
                    aria-hidden="true"
                  />
                  {t === "primary" ? "Primary" : "Secondary"}
                </button>
              ))}
            </div>
          </div>

          <div className="oncall-modal__time-pair">
            <label className="field oncall-modal__label">
              <span className="field__label">Start</span>
              <input
                className="input oncall-modal__input oncall-modal__input--mono"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                onKeyDown={onKey}
                placeholder="09:00"
                aria-label="Start time"
                inputMode="numeric"
              />
            </label>
            <label className="field oncall-modal__label">
              <span className="field__label">End</span>
              <input
                className="input oncall-modal__input oncall-modal__input--mono"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                onKeyDown={onKey}
                placeholder="22:00"
                aria-label="End time"
                inputMode="numeric"
              />
            </label>
          </div>

          <label className="field oncall-modal__label">
            <span className="field__label">Note</span>
            <input
              className="input oncall-modal__input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={onKey}
              placeholder="Optional"
              aria-label="Note"
            />
          </label>

          <p
            className={`oncall-modal__summary${minutes > 0 ? "" : " oncall-modal__summary--invalid"}`}
          >
            <Icon name="clock" size={14} />
            <span>
              {minutes > 0
                ? `${formatDuration(minutes)}${isOvernight({ start, end }) ? " · ends next day" : ""}`
                : "Start and end can't be the same."}
            </span>
          </p>
        </div>
      </div>

      {formError && (
        <p className="ui-modal__error oncall-modal__error" role="alert">
          {formError}
        </p>
      )}

      <div className="ui-modal__actions oncall-modal__actions">
        <button className="btn btn--secondary oncall-modal__btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn--primary oncall-modal__btn oncall-modal__btn--primary"
          onClick={handleSubmit}
        >
          {shift ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
