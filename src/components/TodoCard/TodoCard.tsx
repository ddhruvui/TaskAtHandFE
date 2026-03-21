import { useState, useRef, useEffect } from "react";
import type { TodoCardProps } from "./TodoCard.types";
import "./TodoCard.css";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TodoCard({
  todo,
  onToggleDone,
  onNotesChange,
  onPriorityChange,
  onDelete,
}: TodoCardProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(todo.notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingNotes && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editingNotes]);

  // Sync draft from prop only when not editing
  if (!editingNotes && draftNotes !== todo.notes) {
    setDraftNotes(todo.notes);
  }

  const commitNotes = () => {
    setEditingNotes(false);
    if (draftNotes !== todo.notes) {
      onNotesChange(todo.id, draftNotes);
    }
  };

  return (
    <div className={`todo-card ${todo.done ? "todo-card--done" : ""}`}>
      {/* Header row: checkbox + name + priority */}
      <div className="todo-card__header">
        <button
          className={`todo-card__checkbox ${todo.done ? "todo-card__checkbox--checked" : ""}`}
          onClick={() => onToggleDone(todo.id)}
          aria-label={todo.done ? "Mark as not done" : "Mark as done"}
        >
          {todo.done && (
            <svg viewBox="0 0 24 24" className="todo-card__check-icon">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <h3
          className={`todo-card__name ${todo.done ? "todo-card__name--done" : ""}`}
        >
          {todo.name}
        </h3>

        <button
          className="todo-card__delete-btn"
          onClick={() => onDelete(todo.id)}
          aria-label="Delete todo"
        >
          <svg viewBox="0 0 24 24" className="todo-card__delete-icon">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="todo-card__priority">
          <button
            className="todo-card__priority-btn"
            onClick={() => onPriorityChange(todo.id, "up")}
            aria-label="Increase priority"
            disabled={todo.priority <= 1}
          >
            <svg viewBox="0 0 24 24" className="todo-card__arrow-icon">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          <button
            className="todo-card__priority-btn"
            onClick={() => onPriorityChange(todo.id, "down")}
            aria-label="Decrease priority"
            disabled={todo.priority >= 5}
          >
            <svg viewBox="0 0 24 24" className="todo-card__arrow-icon">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notes section */}
      <div className="todo-card__notes">
        <label className="todo-card__section-label">Notes</label>
        {editingNotes ? (
          <textarea
            ref={textareaRef}
            className="todo-card__notes-input"
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            onBlur={commitNotes}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraftNotes(todo.notes);
                setEditingNotes(false);
              }
            }}
            rows={3}
          />
        ) : (
          <div
            className="todo-card__notes-display"
            onClick={() => setEditingNotes(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setEditingNotes(true);
            }}
          >
            {todo.notes || (
              <span className="todo-card__placeholder">
                Click to add notes…
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dates footer */}
      <div className="todo-card__dates">
        <div className="todo-card__date">
          <span className="todo-card__date-label">Created</span>
          <span className="todo-card__date-value">
            {formatDate(todo.createdAt)}
          </span>
        </div>
        <div className="todo-card__date">
          <span className="todo-card__date-label">Updated</span>
          <span className="todo-card__date-value">
            {formatDate(todo.updatedAt)}
          </span>
        </div>
        <div className="todo-card__date">
          <span className="todo-card__date-label">ECD</span>
          <span className="todo-card__date-value">{formatDate(todo.ecd)}</span>
        </div>
      </div>
    </div>
  );
}
