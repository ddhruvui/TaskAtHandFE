import { useState } from "react";
import type { Task } from "../../types";
import type { TaskCardProps } from "./TaskCard.types";
import { EditNotesModal } from "../EditNotesModal";
import "./TaskCard.css";

function getOrdinal(n: number): string {
  const v = n % 100;
  const suffix = ["th", "st", "nd", "rd"];
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]);
}

interface EcdDisplay {
  label: string;
  recurring: boolean;
}

function resolveEcd(task: Task): EcdDisplay {
  if (!task.ecd) {
    return { label: "No date", recurring: false };
  }

  switch (task.ecd.type) {
    case "date": {
      // Parse date string directly to avoid timezone issues
      const [year, month, day] = task.ecd.value.split("-");
      const currentYear = new Date().getFullYear();
      const mm = String(parseInt(month, 10)).padStart(2, "0");
      const dd = String(parseInt(day, 10)).padStart(2, "0");
      if (parseInt(year, 10) === currentYear) {
        return { label: `${mm}/${dd}`, recurring: false };
      }
      const yy = year.slice(-2);
      return { label: `${mm}/${dd}/${yy}`, recurring: false };
    }

    case "day_of_week": {
      const label = task.ecd.value.join(", ");
      return { label: `↻ ${label}`, recurring: true };
    }

    case "day_of_month": {
      const label = [...task.ecd.value]
        .sort((a, b) => a - b)
        .map((d) => getOrdinal(d))
        .join(", ");
      return { label: `↻ ${label}`, recurring: true };
    }

    case "day_of_year": {
      return { label: `↻ ${task.ecd.value}`, recurring: true };
    }

    default:
      return { label: "No date", recurring: false };
  }
}

export default function TaskCard({
  task,
  isFirst,
  isLast,
  prevTaskDone,
  nextTaskDone,
  onToggleDone,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: TaskCardProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { label: ecdLabel, recurring: ecdRecurring } = resolveEcd(task);

  // Not-done tasks must stay above done tasks
  const canMoveUp = !isFirst && !(task.done && prevTaskDone === false);
  const canMoveDown = !isLast && !(!task.done && nextTaskDone === true);

  return (
    <>
      <div className={`task-card ${task.done ? "task-card--done" : ""}`}>
        {/* ── Row: [checkbox] [body] [actions] ── */}
        <div className="task-card__header">
          {/* Checkbox */}
          <button
            className={`task-card__checkbox ${task.done ? "task-card__checkbox--checked" : ""}`}
            onClick={() => onToggleDone(task._id)}
            aria-label={task.done ? "Mark as not done" : "Mark as done"}
          >
            {task.done && (
              <svg viewBox="0 0 16 16" className="task-card__check-icon">
                <path
                  fillRule="evenodd"
                  d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
                />
              </svg>
            )}
          </button>

          {/* Name + ECD + notes */}
          <span className="task-card__body">
            <span className="task-card__label">
              <span
                className={`task-card__name ${task.done ? "task-card__name--done" : ""}`}
              >
                {task.name}
              </span>
              <span
                className={`task-card__ecd${ecdRecurring ? " task-card__ecd--recurring" : ""}`}
              >
                [ {ecdLabel} ]
              </span>
              {task.notes && <span className="task-card__arrow">=&gt;</span>}
            </span>
            {task.notes && (
              <span className="task-card__notes-text">{task.notes}</span>
            )}
          </span>

          {/* Action buttons */}
          <div className="task-card__actions">
            <button
              className="task-card__action-btn"
              onClick={() => setEditModalOpen(true)}
              aria-label="Edit notes"
              title="Edit notes"
            >
              <svg viewBox="0 0 16 16" className="task-card__action-icon">
                <path
                  fillRule="evenodd"
                  d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286z"
                />
              </svg>
            </button>
            <button
              className="task-card__action-btn"
              onClick={() => onMoveDown(task._id)}
              disabled={!canMoveDown}
              aria-label="Move down"
              title="Move down"
            >
              <svg viewBox="0 0 16 16" className="task-card__action-icon">
                <path
                  fillRule="evenodd"
                  d="M8 2.25a.75.75 0 0 1 .75.75v8.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L7.25 11.19V3A.75.75 0 0 1 8 2.25z"
                />
              </svg>
            </button>
            <button
              className="task-card__action-btn"
              onClick={() => onMoveUp(task._id)}
              disabled={!canMoveUp}
              aria-label="Move up"
              title="Move up"
            >
              <svg
                viewBox="0 0 16 16"
                className="task-card__action-icon task-card__action-icon--flip"
              >
                <path
                  fillRule="evenodd"
                  d="M8 2.25a.75.75 0 0 1 .75.75v8.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L7.25 11.19V3A.75.75 0 0 1 8 2.25z"
                />
              </svg>
            </button>
            <button
              className="task-card__action-btn task-card__action-btn--danger"
              onClick={() => onDelete(task._id)}
              aria-label="Delete task"
              title="Delete"
            >
              <svg viewBox="0 0 16 16" className="task-card__action-icon">
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
          taskName={task.name}
          notes={task.notes}
          createdAt={task.createdAt}
          updatedAt={task.updatedAt}
          ecd={task.ecd}
          onConfirm={(payload) => {
            onEdit(task._id, payload);
            setEditModalOpen(false);
          }}
          onCancel={() => setEditModalOpen(false)}
        />
      )}
    </>
  );
}
