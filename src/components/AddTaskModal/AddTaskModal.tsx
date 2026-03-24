import { useState, useRef, useEffect } from "react";
import type { Folder } from "../FolderCard";
import "./AddTaskModal.css";

type EcdMode = "date" | "week" | "month";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function getOrdinal(n: number): string {
  const v = n % 100;
  const suffix = ["th", "st", "nd", "rd"];
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]);
}

function todayInputVal(): string {
  return new Date().toISOString().slice(0, 10);
}

interface AddTaskModalProps {
  folderName: string;
  allowRecurring: boolean;
  onConfirm: (todo: Folder["todos"][0]) => void;
  onCancel: () => void;
}

export default function AddTaskModal({
  folderName,
  allowRecurring,
  onConfirm,
  onCancel,
}: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<EcdMode>(allowRecurring ? "week" : "date");
  const [dateVal, setDateVal] = useState(todayInputVal);
  const [dowVal, setDowVal] = useState<number[]>([1]);
  const [domVal, setDomVal] = useState<number[]>([1]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function toggle(arr: number[], val: number): number[] {
    if (arr.includes(val)) {
      return arr.length > 1 ? arr.filter((v) => v !== val) : arr;
    }
    return [...arr, val].sort((a, b) => a - b);
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    // Recurring modes have no fixed date — ecd must be null for habits
    const ecd =
      mode === "date" && dateVal ? new Date(dateVal).toISOString() : null;
    const todo: Folder["todos"][0] = {
      _id: `${Date.now()}`,
      name: trimmed,
      notes,
      done: false,
      priority: 0,
      createdAt: now,
      updatedAt: now,
      ecd,
      ...(mode === "week" ? { ecdDayOfWeek: dowVal } : {}),
      ...(mode === "month" ? { ecdDayOfMonth: domVal } : {}),
    };
    onConfirm(todo);
  }

  return (
    <div className="add-modal__overlay" onClick={onCancel}>
      <div className="add-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="add-modal__title">
          Add task{" "}
          <span className="add-modal__title-folder">— {folderName}</span>
        </h3>

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
            {((allowRecurring ? ["week", "month"] : ["date"]) as EcdMode[]).map(
              (m) => (
                <button
                  key={m}
                  type="button"
                  className={`add-modal__mode-btn${mode === m ? " add-modal__mode-btn--active" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {m === "date" ? "Date" : m === "week" ? "Weekly" : "Monthly"}
                </button>
              ),
            )}
          </div>

          {mode === "date" && (
            <input
              type="date"
              className="add-modal__date-input"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
            />
          )}

          {mode === "week" && (
            <div className="add-modal__dow">
              {DOW_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`add-modal__dow-btn${dowVal.includes(i + 1) ? " add-modal__dow-btn--active" : ""}`}
                  onClick={() => setDowVal((prev) => toggle(prev, i + 1))}
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
                  onClick={() => setDomVal((prev) => toggle(prev, d))}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {mode === "week" && (
            <p className="add-modal__ecd-hint">
              Repeats every{" "}
              {[...dowVal]
                .sort((a, b) => a - b)
                .map((d) => DOW_LABELS[d - 1])
                .join(", ")}
            </p>
          )}
          {mode === "month" && (
            <p className="add-modal__ecd-hint">
              Repeats on the{" "}
              {[...domVal]
                .sort((a, b) => a - b)
                .map((d) => getOrdinal(d))
                .join(", ")}{" "}
              of each month
            </p>
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
