import { useState, useRef, useEffect } from "react";
import { todayDateKey } from "../../utils/ecd";
import { EcdCalendar } from "../DatePicker";
import { Modal } from "../Modal";
import "./ProjectTaskModal.css";

type DateMode = "none" | "date";

interface ProjectTaskModalProps {
  projectName: string;
  /** When provided, we're editing; otherwise adding. */
  task?: { name: string; notes: string; date: string | null };
  /** True while the parent's save is in flight — blocks a duplicate submit. */
  busy?: boolean;
  onConfirm: (draft: {
    name: string;
    notes: string;
    date: string | null;
  }) => void;
  onCancel: () => void;
}

/**
 * Add/edit a project task: a name plus an optional one-time target date.
 * Mirrors the todo's AddTaskModal interaction, but project tasks only
 * support plain dates (no recurring ECD types) — a dated task is mirrored
 * into the todo under a header named after the project.
 */
export default function ProjectTaskModal({
  projectName,
  task,
  busy = false,
  onConfirm,
  onCancel,
}: ProjectTaskModalProps) {
  const [name, setName] = useState(task?.name ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [mode, setMode] = useState<DateMode>(task?.date ? "date" : "none");
  const [dateVal, setDateVal] = useState(task?.date ?? todayDateKey());
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (nameRef.current && task) {
      // Select all text when editing
      nameRef.current.select();
    }
  }, [task]);

  function handleSubmit() {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm({
      name: trimmed,
      notes,
      date: mode === "date" ? dateVal : null,
    });
  }

  return (
    <Modal
      onClose={onCancel}
      className="project-task-modal"
      overlayClassName="project-task-modal__overlay"
      labelledBy="project-task-modal-title"
    >
      <h3
        id="project-task-modal-title"
        className="ui-modal__title project-task-modal__title"
      >
        {task ? "Edit task" : "Add task"}{" "}
        <span className="ui-modal__subtitle project-task-modal__title-folder">
          — {projectName}
        </span>
      </h3>

      {/* Task name */}
      <input
        ref={nameRef}
        className="input project-task-modal__name-input"
        type="text"
        placeholder="Task name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />

      {/* Date section */}
      <div className="project-task-modal__ecd">
        <span className="field__label project-task-modal__ecd-label">Due</span>
        <div
          className="segmented project-task-modal__ecd-modes"
          role="group"
          aria-label="Due"
        >
          {(["none", "date"] as DateMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`segmented__btn project-task-modal__mode-btn${mode === m ? " segmented__btn--active project-task-modal__mode-btn--active" : ""}`}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m === "none" ? "None" : "Date"}
            </button>
          ))}
        </div>

        {mode === "date" && (
          <EcdCalendar mode="date" value={dateVal} onChange={setDateVal} />
        )}

        {mode === "date" && (
          <p className="field__hint project-task-modal__ecd-hint">
            Will appear in the todo under "{projectName}"
          </p>
        )}
      </div>

      {/* Notes — mirrored onto the linked todo task */}
      <div className="field project-task-modal__notes">
        <label
          htmlFor="project-task-modal-notes"
          className="field__label project-task-modal__ecd-label"
        >
          Notes
        </label>
        <textarea
          id="project-task-modal-notes"
          className="textarea project-task-modal__notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes…"
          rows={3}
        />
      </div>

      <div className="ui-modal__actions project-task-modal__actions">
        <button
          className="btn btn--secondary project-task-modal__btn project-task-modal__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary project-task-modal__btn project-task-modal__btn--confirm"
          onClick={handleSubmit}
          disabled={!name.trim() || busy}
        >
          {task ? "Save" : "Add task"}
        </button>
      </div>
    </Modal>
  );
}
