import { useState } from "react";
import type { DayOfWeek } from "../../types";
import { WEEK_DAYS } from "../../utils/goalSync";
// Same stylesheet and `add-modal__*` classes the todo's add-task dialog uses,
// including its day-of-week strip — picking the days a habit runs on is the
// same gesture as picking a weekly task's ECD, so the two must look identical
// from one source.
import "../AddTaskModal/AddTaskModal.css";

/** Picker order — Mon-first, matching AddTaskModal's weekly ECD strip. */
const PICKER_ORDER: DayOfWeek[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

const PRESETS: { label: string; days: DayOfWeek[] }[] = [
  { label: "Every day", days: [...WEEK_DAYS] },
  { label: "Weekdays", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { label: "Weekends", days: ["Sat", "Sun"] },
];

interface StepDaysModalProps {
  goalName: string;
  stepName: string;
  /** Days checked when the dialog opens. */
  initialDays: DayOfWeek[];
  /** "start" is picking the schedule for a step about to begin; "edit" is
   *  changing the schedule of one already under progress. */
  mode: "start" | "edit";
  busy?: boolean;
  onConfirm: (days: DayOfWeek[]) => void;
  onCancel: () => void;
}

/**
 * Choose which weekdays an under-progress step runs on. The selection becomes
 * the `day_of_week` ECD of its task under "One Step At A Time", and because
 * the nightly archive only records a result on days that ECD covers, it is
 * also the set the habit's streak is counted over — skipping a day the habit
 * isn't scheduled on doesn't break it.
 */
export default function StepDaysModal({
  goalName,
  stepName,
  initialDays,
  mode,
  busy = false,
  onConfirm,
  onCancel,
}: StepDaysModalProps) {
  const [days, setDays] = useState<DayOfWeek[]>(initialDays);

  // Always emitted in week order so it matches what the backend stores and
  // what the todo card renders.
  const selected = WEEK_DAYS.filter((d) => days.includes(d));

  const toggle = (day: DayOfWeek) =>
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  return (
    <div className="add-modal__overlay" onClick={onCancel}>
      <div
        className="add-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      >
        <h3 className="add-modal__title">
          {mode === "start" ? "Start step" : "Change days"}{" "}
          <span className="add-modal__title-folder">— {stepName}</span>
        </h3>

        <div className="add-modal__ecd">
          <div className="add-modal__dow">
            {PICKER_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                className={`add-modal__dow-btn${days.includes(day) ? " add-modal__dow-btn--active" : ""}`}
                aria-pressed={days.includes(day)}
                aria-label={`Toggle ${day}`}
                onClick={() => toggle(day)}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="add-modal__ecd-modes">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="add-modal__mode-btn"
                onClick={() => setDays([...preset.days])}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <p className="add-modal__ecd-hint">
            {selected.length === 0
              ? "Pick at least one day — a habit needs a day to run on."
              : `Due every ${selected.join(", ")} under "${goalName}". The streak counts only these days.`}
          </p>
        </div>

        <div className="add-modal__actions">
          <button
            className="add-modal__btn add-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="add-modal__btn add-modal__btn--confirm"
            onClick={() => onConfirm(selected)}
            disabled={busy || selected.length === 0}
          >
            {mode === "start" ? "Start step" : "Save days"}
          </button>
        </div>
      </div>
    </div>
  );
}
