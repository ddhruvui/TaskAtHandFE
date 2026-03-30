import { useState, useRef, useEffect } from "react";
import type { EditPayload } from "../TaskCard/TaskCard.types";
import type { ECD } from "../../types";
import { buildEcdFromInputs } from "../../utils/ecd";
import "./EditNotesModal.css";

type EcdMode = "date" | "week" | "month" | "year" | "none";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface EditNotesModalProps {
  taskName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  ecd: ECD | null;
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

function getOrdinal(n: number): string {
  const v = n % 100;
  const suffix = ["th", "st", "nd", "rd"];
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]);
}

function toggleInArray<T>(arr: T[], val: T): T[] {
  if (arr.includes(val)) {
    return arr.length > 1 ? arr.filter((v) => v !== val) : arr;
  }
  return [...arr, val].sort();
}

function detectInitialState(ecd: ECD | null): {
  mode: EcdMode;
  dateVal: string;
  dowVal: (typeof DOW_LABELS)[number][];
  domVal: number[];
  yearVal: string;
} {
  if (!ecd) {
    return {
      mode: "none",
      dateVal: new Date().toISOString().slice(0, 10),
      dowVal: ["Mon"],
      domVal: [1],
      yearVal: `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
    };
  }

  switch (ecd.type) {
    case "date":
      return {
        mode: "date",
        dateVal: ecd.value,
        dowVal: ["Mon"],
        domVal: [1],
        yearVal: "",
      };

    case "day_of_week":
      return {
        mode: "week",
        dateVal: "",
        dowVal: ecd.value,
        domVal: [1],
        yearVal: "",
      };

    case "day_of_month":
      return {
        mode: "month",
        dateVal: "",
        dowVal: ["Mon"],
        domVal: ecd.value,
        yearVal: "",
      };

    case "day_of_year":
      return {
        mode: "year",
        dateVal: "",
        dowVal: ["Mon"],
        domVal: [1],
        yearVal: ecd.value,
      };

    default:
      return {
        mode: "none",
        dateVal: "",
        dowVal: ["Mon"],
        domVal: [1],
        yearVal: "",
      };
  }
}

export default function EditNotesModal({
  taskName,
  notes,
  createdAt,
  updatedAt,
  ecd,
  onConfirm,
  onCancel,
}: EditNotesModalProps) {
  const [nameDraft, setNameDraft] = useState(taskName);
  const [draft, setDraft] = useState(notes);
  const initial = detectInitialState(ecd);
  const [mode, setMode] = useState<EcdMode>(initial.mode);
  const [dateVal, setDateVal] = useState(initial.dateVal);
  const [dowVal, setDowVal] = useState<(typeof DOW_LABELS)[number][]>(
    initial.dowVal,
  );
  const [domVal, setDomVal] = useState<number[]>(initial.domVal);
  const [yearVal, setYearVal] = useState(initial.yearVal);
  const [formError, setFormError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSave() {
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      setFormError("Task name is required.");
      return;
    }

    const { ecd: newEcd, error } = buildEcdFromInputs({
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

    onConfirm({ name: trimmedName, notes: draft, ecd: newEcd });
  }

  return (
    <div className="edit-modal__overlay" onClick={onCancel}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="edit-modal__title">{taskName}</h3>
        <input
          className="edit-modal__name-input"
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="Task name"
        />
        {formError && <p className="edit-modal__ecd-hint">{formError}</p>}

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
            {(["none", "date", "week", "month", "year"] as EcdMode[]).map(
              (m) => (
                <button
                  key={m}
                  className={`edit-modal__mode-btn${
                    mode === m ? " edit-modal__mode-btn--active" : ""
                  }`}
                  onClick={() => setMode(m)}
                  type="button"
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
            <input
              type="date"
              className="edit-modal__date-input"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
            />
          )}

          {mode === "week" && (
            <div className="edit-modal__dow">
              {DOW_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`edit-modal__dow-btn${
                    dowVal.includes(label) ? " edit-modal__dow-btn--active" : ""
                  }`}
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
            <div className="edit-modal__dom">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`edit-modal__dom-btn${
                    domVal.includes(d) ? " edit-modal__dom-btn--active" : ""
                  }`}
                  onClick={() => setDomVal((prev) => toggleInArray(prev, d))}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {mode === "year" && (
            <input
              type="text"
              className="edit-modal__date-input"
              value={yearVal}
              onChange={(e) => setYearVal(e.target.value)}
              placeholder="D/M/YYYY (e.g., 25/12/2026)"
            />
          )}

          {mode === "week" && dowVal.length > 0 && (
            <p className="edit-modal__ecd-hint">
              Repeats every {dowVal.join(", ")}
            </p>
          )}
          {mode === "month" && domVal.length > 0 && (
            <p className="edit-modal__ecd-hint">
              Repeats on the{" "}
              {[...domVal]
                .sort((a, b) => a - b)
                .map((d) => getOrdinal(d))
                .join(", ")}{" "}
              of each month
            </p>
          )}
          {mode === "year" && yearVal && (
            <p className="edit-modal__ecd-hint">
              Repeats annually on {yearVal}
            </p>
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
