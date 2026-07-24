import { useState, useRef, useEffect } from "react";
import { todayDateKey } from "../../utils/ecd";
import { EcdCalendar } from "../DatePicker";
import "./ProjectTaskModal.css";

type DateMode = "none" | "date";

interface ProjectTaskModalProps {
  projectName: string;
  /** When provided, we're editing; otherwise adding. */
  task?: { name: string; date: string | null };
  onConfirm: (draft: { name: string; date: string | null }) => void;
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
  onConfirm,
  onCancel,
}: ProjectTaskModalProps) {
  const [name, setName] = useState(task?.name ?? "");
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
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm({ name: trimmed, date: mode === "date" ? dateVal : null });
  }

  return (
    <div className="project-task-modal__overlay" onClick={onCancel}>
      <div className="project-task-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="project-task-modal__title">
          {task ? "Edit task" : "Add task"}{" "}
          <span className="project-task-modal__title-folder">
            — {projectName}
          </span>
        </h3>

        {/* Task name */}
        <input
          ref={nameRef}
          className="project-task-modal__name-input"
          type="text"
          placeholder="Task name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />

        {/* Date section */}
        <div className="project-task-modal__ecd">
          <span className="project-task-modal__ecd-label">Due</span>
          <div className="project-task-modal__ecd-modes">
            {(["none", "date"] as DateMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`project-task-modal__mode-btn${mode === m ? " project-task-modal__mode-btn--active" : ""}`}
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
            <p className="project-task-modal__ecd-hint">
              Will appear in the todo under "{projectName}"
            </p>
          )}
        </div>

        <div className="project-task-modal__actions">
          <button
            className="project-task-modal__btn project-task-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="project-task-modal__btn project-task-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {task ? "Save" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}
