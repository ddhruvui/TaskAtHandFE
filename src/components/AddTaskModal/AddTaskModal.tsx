import { useState, useRef, useEffect } from "react";
import type { ECD } from "../../types";
import { buildEcdFromInputs } from "../../utils/ecd";
import { EcdCalendar } from "../DatePicker";
import "./AddTaskModal.css";

type EcdMode = "date" | "week" | "month" | "year" | "none";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function getOrdinal(n: number): string {
  const v = n % 100;
  const suffix = ["th", "st", "nd", "rd"];
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]);
}

function todayInputVal(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayDMY(): string {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function toggleInArray<T>(arr: T[], val: T): T[] {
  if (arr.includes(val)) {
    return arr.length > 1 ? arr.filter((v) => v !== val) : arr;
  }
  return [...arr, val].sort();
}

interface AddTaskModalProps {
  headerName: string;
  onConfirm: (task: { name: string; notes: string; ecd: ECD | null }) => void;
  onCancel: () => void;
}

export default function AddTaskModal({
  headerName,
  onConfirm,
  onCancel,
}: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<EcdMode>("none");
  const [dateVal, setDateVal] = useState(todayInputVal);
  const [dowVal, setDowVal] = useState<(typeof DOW_LABELS)[number][]>(["Mon"]);
  const [domVal, setDomVal] = useState<number[]>([1]);
  const [yearVal, setYearVal] = useState(todayDMY());
  const [formError, setFormError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { ecd, error } = buildEcdFromInputs({
      mode,
      dateVal,
      dowVal: [...dowVal],
      domVal: [...domVal],
      yearVal,
    });
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);

    onConfirm({ name: trimmed, notes, ecd });
  }

  return (
    <div className="add-modal__overlay" onClick={onCancel}>
      <div className="add-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="add-modal__title">
          Add task{" "}
          <span className="add-modal__title-folder">— {headerName}</span>
        </h3>
        {formError && <p className="add-modal__ecd-hint">{formError}</p>}

        {/* Task name */}
        <input
          ref={nameRef}
          className="add-modal__name-input"
          type="text"
          placeholder="Task name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") onCancel();
          }}
        />

        {/* ECD section */}
        <div className="add-modal__ecd">
          <span className="add-modal__ecd-label">Due</span>
          <div className="add-modal__ecd-modes">
            {(["none", "date", "week", "month", "year"] as EcdMode[]).map(
              (m) => (
                <button
                  key={m}
                  type="button"
                  className={`add-modal__mode-btn${mode === m ? " add-modal__mode-btn--active" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {m === "none"
                    ? "None"
                    : m === "date"
                      ? "Date"
                      : m === "week"
                        ? "Weekly"
                        : m === "month"
                          ? "Monthly"
                          : "Yearly"}
                </button>
              ),
            )}
          </div>

          {mode === "date" && (
            <EcdCalendar mode="date" value={dateVal} onChange={setDateVal} />
          )}

          {mode === "week" && (
            <div className="add-modal__dow">
              {DOW_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`add-modal__dow-btn${dowVal.includes(label) ? " add-modal__dow-btn--active" : ""}`}
                  onClick={() =>
                    setDowVal((prev) => toggleInArray(prev, label))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {mode === "month" && (
            <div className="add-modal__dom">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`add-modal__dom-btn${domVal.includes(d) ? " add-modal__dom-btn--active" : ""}`}
                  onClick={() => setDomVal((prev) => toggleInArray(prev, d))}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {mode === "year" && (
            <EcdCalendar mode="year" value={yearVal} onChange={setYearVal} />
          )}

          {mode === "week" && dowVal.length > 0 && (
            <p className="add-modal__ecd-hint">
              Repeats every {dowVal.join(", ")}
            </p>
          )}
          {mode === "month" && domVal.length > 0 && (
            <p className="add-modal__ecd-hint">
              Repeats on the{" "}
              {[...domVal]
                .sort((a, b) => a - b)
                .map((d) => getOrdinal(d))
                .join(", ")}{" "}
              of each month
            </p>
          )}
          {mode === "year" && yearVal && (
            <p className="add-modal__ecd-hint">Repeats annually on {yearVal}</p>
          )}
        </div>

        {/* Notes */}
        <textarea
          className="add-modal__textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)…"
          rows={4}
        />

        <div className="add-modal__actions">
          <button
            className="add-modal__btn add-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="add-modal__btn add-modal__btn--confirm"
            onClick={handleAdd}
            disabled={!name.trim()}
          >
            Add task
          </button>
        </div>
      </div>
    </div>
  );
}
