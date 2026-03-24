import { useState } from "react";
import type { Todo, TodoCardProps } from "./TodoCard.types";
import { EditNotesModal } from "../EditNotesModal";
import "./TodoCard.css";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function getOrdinal(n: number): string {
  const v = n % 100;
  const suffix = ["th", "st", "nd", "rd"];
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]);
}

interface EcdDisplay {
  label: string;
  recurring: boolean;
}

function resolveEcd(todo: Todo): EcdDisplay {
  if (todo.ecdDayOfWeek != null && todo.ecdDayOfWeek.length > 0) {
    const label = [...todo.ecdDayOfWeek]
      .sort((a, b) => a - b)
      .map((d) => DOW_LABELS[Math.min(Math.max(d, 1), 7) - 1])
      .join(", ");
    return { label: `↻ ${label}`, recurring: true };
  }
  if (todo.ecdDayOfMonth != null && todo.ecdDayOfMonth.length > 0) {
    const label = [...todo.ecdDayOfMonth]
      .sort((a, b) => a - b)
      .map((d) => getOrdinal(Math.min(Math.max(d, 1), 31)))
      .join(", ");
    return { label: `↻ ${label}`, recurring: true };
  }
  // Fall back to fixed date
  if (!todo.ecd) {
    return { label: "No date", recurring: false };
  }
  const d = new Date(todo.ecd);
  const currentYear = new Date().getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  if (d.getUTCFullYear() === currentYear) {
    return { label: `${month}/${day}`, recurring: false };
  }
  const yy = String(d.getUTCFullYear()).slice(-2);
  return { label: `${month}/${day}/${yy}`, recurring: false };
}

export default function TodoCard({
  todo,
  isFirst,
  isLast,
  allowRecurring,
  onToggleDone,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: TodoCardProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { label: ecdLabel, recurring: ecdRecurring } = resolveEcd(todo);

  return (
    <>
      <div className={`todo-card ${todo.done ? "todo-card--done" : ""}`}>
        {/* ── Row: [checkbox] [body] [actions] ── */}
        <div className="todo-card__header">
          {/* Checkbox */}
          <button
            className={`todo-card__checkbox ${todo.done ? "todo-card__checkbox--checked" : ""}`}
            onClick={() => onToggleDone(todo._id)}
            aria-label={todo.done ? "Mark as not done" : "Mark as done"}
          >
            {todo.done && (
              <svg viewBox="0 0 16 16" className="todo-card__check-icon">
                <path
                  fillRule="evenodd"
                  d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
                />
              </svg>
            )}
          </button>

          {/* Name + ECD + notes */}
          <span className="todo-card__body">
            <span className="todo-card__label">
              <span
                className={`todo-card__name ${todo.done ? "todo-card__name--done" : ""}`}
              >
                {todo.name}
              </span>
              <span
                className={`todo-card__ecd${ecdRecurring ? " todo-card__ecd--recurring" : ""}`}
              >
                [ {ecdLabel} ]
              </span>
              {todo.notes && <span className="todo-card__arrow">=&gt;</span>}
            </span>
            {todo.notes && (
              <span className="todo-card__notes-text">{todo.notes}</span>
            )}
          </span>

          {/* Action buttons */}
          <div className="todo-card__actions">
            <button
              className="todo-card__action-btn"
              onClick={() => setEditModalOpen(true)}
              aria-label="Edit notes"
              title="Edit notes"
            >
              <svg viewBox="0 0 16 16" className="todo-card__action-icon">
                <path
                  fillRule="evenodd"
                  d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286z"
                />
              </svg>
            </button>
            <button
              className="todo-card__action-btn"
              onClick={() => onMoveUp(todo._id)}
              disabled={isFirst}
              aria-label="Move up"
              title="Move up"
            >
              <svg viewBox="0 0 16 16" className="todo-card__action-icon">
                <path
                  fillRule="evenodd"
                  d="M8 2.25a.75.75 0 0 1 .75.75v8.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L7.25 11.19V3A.75.75 0 0 1 8 2.25z"
                />
              </svg>
            </button>
            <button
              className="todo-card__action-btn"
              onClick={() => onMoveDown(todo._id)}
              disabled={isLast}
              aria-label="Move down"
              title="Move down"
            >
              <svg
                viewBox="0 0 16 16"
                className="todo-card__action-icon todo-card__action-icon--flip"
              >
                <path
                  fillRule="evenodd"
                  d="M8 2.25a.75.75 0 0 1 .75.75v8.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L7.25 11.19V3A.75.75 0 0 1 8 2.25z"
                />
              </svg>
            </button>
            <button
              className="todo-card__action-btn todo-card__action-btn--danger"
              onClick={() => onDelete(todo._id)}
              aria-label="Delete todo"
              title="Delete"
            >
              <svg viewBox="0 0 16 16" className="todo-card__action-icon">
                <path
                  fillRule="evenodd"
                  d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 1 0-1.492.141l.6 6.35A1.5 1.5 0 0 0 5.1 14.4h5.8a1.5 1.5 0 0 0 1.496-1.35l.6-6.35a.75.75 0 1 0-1.492-.141l-.6 6.33a.008.008 0 0 1-.007.011H5.104a.008.008 0 0 1-.007-.01l-.6-6.332z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {editModalOpen && (
        <EditNotesModal
          taskName={todo.name}
          notes={todo.notes}
          createdAt={todo.createdAt}
          updatedAt={todo.updatedAt}
          ecd={todo.ecd}
          ecdDayOfWeek={todo.ecdDayOfWeek}
          ecdDayOfMonth={todo.ecdDayOfMonth}
          allowRecurring={allowRecurring}
          onConfirm={(payload) => {
            onEdit(todo._id, payload);
            setEditModalOpen(false);
          }}
          onCancel={() => setEditModalOpen(false)}
        />
      )}
    </>
  );
}
