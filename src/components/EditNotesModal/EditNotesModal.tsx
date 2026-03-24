import { useState, useRef, useEffect } from "react";
import type { EditPayload } from "../TodoCard/TodoCard.types";
import "./EditNotesModal.css";

type EcdMode = "date" | "week" | "month";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface EditNotesModalProps {
  taskName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  ecd: string | null;
  ecdDayOfWeek?: number[];
  ecdDayOfMonth?: number[];
  allowRecurring: boolean;
  onConfirm: (payload: EditPayload) => void;
  onCancel: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Convert ISO string to YYYY-MM-DD for <input type="date"> */
function isoToDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

function detectMode(
  ecdDayOfWeek?: number[],
  ecdDayOfMonth?: number[],
): EcdMode {
  if (ecdDayOfWeek != null && ecdDayOfWeek.length > 0) return "week";
  if (ecdDayOfMonth != null && ecdDayOfMonth.length > 0) return "month";
  return "date";
}

function toggle(arr: number[], val: number): number[] {
  if (arr.includes(val)) {
    // keep at least one selected
    return arr.length > 1 ? arr.filter((v) => v !== val) : arr;
  }
  return [...arr, val].sort((a, b) => a - b);
}

export default function EditNotesModal({
  taskName,
  notes,
  createdAt,
  updatedAt,
  ecd,
  ecdDayOfWeek,
  ecdDayOfMonth,
  allowRecurring,
  onConfirm,
  onCancel,
}: EditNotesModalProps) {
  const [draft, setDraft] = useState(notes);
  const [mode, setMode] = useState<EcdMode>(() => {
    const detected = detectMode(ecdDayOfWeek, ecdDayOfMonth);
    if (allowRecurring) return detected === "date" ? "week" : detected;
    return detected !== "date" ? "date" : detected;
  });
  const [dateVal, setDateVal] = useState(() => isoToDateInput(ecd ?? ""));
  const [dowVal, setDowVal] = useState<number[]>(
    ecdDayOfWeek && ecdDayOfWeek.length > 0 ? [...ecdDayOfWeek] : [1],
  );
  const [domVal, setDomVal] = useState<number[]>(
    ecdDayOfMonth && ecdDayOfMonth.length > 0 ? [...ecdDayOfMonth] : [1],
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSave() {
    let payload: EditPayload;
    if (mode === "week") {
      payload = { notes: draft, ecd, ecdDayOfWeek: dowVal };
    } else if (mode === "month") {
      payload = { notes: draft, ecd, ecdDayOfMonth: domVal };
    } else {
      const isoEcd = dateVal ? new Date(dateVal).toISOString() : (ecd ?? null);
      payload = { notes: draft, ecd: isoEcd };
    }
    onConfirm(payload);
  }

  return (
    <div className="edit-modal__overlay" onClick={onCancel}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="edit-modal__title">{taskName}</h3>

        <div className="edit-modal__meta">
          <span>
            <span className="edit-modal__meta-label">Created</span>{" "}
            {formatDate(createdAt)}
          </span>
          <span className="edit-modal__meta-sep">·</span>
          <span>
            <span className="edit-modal__meta-label">Updated</span>{" "}
            {formatDate(updatedAt)}
          </span>
        </div>

        {/* ── ECD section ── */}
        <div className="edit-modal__ecd">
          <span className="edit-modal__ecd-label">Due</span>
          <div className="edit-modal__ecd-modes">
            {((allowRecurring ? ["week", "month"] : ["date"]) as EcdMode[]).map(
              (m) => (
                <button
                  key={m}
                  className={`edit-modal__mode-btn${
                    mode === m ? " edit-modal__mode-btn--active" : ""
                  }`}
                  onClick={() => setMode(m)}
                  type="button"
                >
                  {m === "date" ? "Date" : m === "week" ? "Weekly" : "Monthly"}
                </button>
              ),
            )}
          </div>

          {mode === "date" && (
            <input
              type="date"
              className="edit-modal__date-input"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
            />
          )}

          {mode === "week" && (
            <div className="edit-modal__dow">
              {DOW_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`edit-modal__dow-btn${
                    dowVal.includes(i + 1) ? " edit-modal__dow-btn--active" : ""
                  }`}
                  onClick={() => setDowVal((prev) => toggle(prev, i + 1))}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {mode === "month" && (
            <div className="edit-modal__dom">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`edit-modal__dom-btn${
                    domVal.includes(d) ? " edit-modal__dom-btn--active" : ""
                  }`}
                  onClick={() => setDomVal((prev) => toggle(prev, d))}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          className="edit-modal__textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add notes…"
          rows={5}
        />

        <div className="edit-modal__actions">
          <button
            className="edit-modal__btn edit-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="edit-modal__btn edit-modal__btn--confirm"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
