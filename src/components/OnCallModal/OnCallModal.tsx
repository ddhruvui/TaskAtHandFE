import { useState, useRef, useEffect } from "react";
import type { OnCallShift, OnCallType } from "../../types";
import { EcdCalendar } from "../DatePicker";
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

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="oncall-modal__overlay" onClick={onCancel}>
      <div className="oncall-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="oncall-modal__title">
          {shift ? "Edit On-call Shift" : "Add On-call Shift"}
        </h3>

        <label className="oncall-modal__label">
          Quick add
          <input
            ref={quickRef}
            className="oncall-modal__input oncall-modal__input--mono"
            type="text"
            placeholder="11/16 9-22"
            value={quick}
            onChange={(e) => handleQuickChange(e.target.value)}
            onKeyDown={onKey}
            aria-label="Quick add on-call shift"
          />
        </label>
        {quick.trim() && (
          <p
            className={`oncall-modal__preview${parsed ? "" : " oncall-modal__preview--error"}`}
          >
            {parsed
              ? `${formatDateKey(parsed.date)} · ${parsed.start} → ${parsed.end}${isOvernight(parsed) ? " (+1 day)" : ""} · ${formatDuration(shiftMinutes(parsed))} · ${parsed.type}`
              : "Use M/D start-end, like 11/16 9-22 or 11/12 22-6 (add s for secondary)"}
          </p>
        )}

        <div
          className="oncall-modal__segmented"
          role="radiogroup"
          aria-label="Shift type"
        >
          {(["primary", "secondary"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              className={`oncall-modal__seg oncall-modal__seg--${t}${type === t ? " oncall-modal__seg--active" : ""}`}
              onClick={() => setType(t)}
            >
              {t === "primary" ? "Primary" : "Secondary"}
            </button>
          ))}
        </div>

        <div className="oncall-modal__fields">
          <div className="oncall-modal__date">
            <span className="oncall-modal__label">Date</span>
            <EcdCalendar mode="date" value={date} onChange={setDate} />
          </div>
          <div className="oncall-modal__times">
            <label className="oncall-modal__label">
              Start
              <input
                className="oncall-modal__input oncall-modal__input--mono"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                onKeyDown={onKey}
                placeholder="09:00"
                aria-label="Start time"
              />
            </label>
            <label className="oncall-modal__label">
              End
              <input
                className="oncall-modal__input oncall-modal__input--mono"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                onKeyDown={onKey}
                placeholder="22:00"
                aria-label="End time"
              />
            </label>
            <label className="oncall-modal__label">
              Note
              <input
                className="oncall-modal__input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={onKey}
                placeholder="Optional"
                aria-label="Note"
              />
            </label>
            <p className="oncall-modal__summary">
              {minutes > 0
                ? `${formatDuration(minutes)}${isOvernight({ start, end }) ? " · ends next day" : ""}`
                : "Start and end can't be the same."}
            </p>
          </div>
        </div>

        {formError && <p className="oncall-modal__error">{formError}</p>}

        <div className="oncall-modal__actions">
          <button className="oncall-modal__btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="oncall-modal__btn oncall-modal__btn--primary"
            onClick={handleSubmit}
          >
            {shift ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
