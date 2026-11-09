import { useState } from "react";
import type { Task } from "../../types";
import type { TaskCardProps } from "./TaskCard.types";
import { EditNotesModal } from "../EditNotesModal";
import { Icon } from "../Icon";
import { daysLabel } from "../../utils/goalSync";
import { getEcdDateKey, todayDateKey } from "../../utils/ecd";
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

/* The ECD label text is a contract: e2e's dateEcdLabel/yearlyEcdLabel
   helpers compute these exact strings. */
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

/**
 * Where an open task stands against today: due today (a dated task for
 * today, or a recurring one whose pattern hits today) or overdue (a dated
 * task in the past). Compared as "YYYY-MM-DD" strings — timezone safe.
 * Done tasks have no urgency.
 */
function dueState(task: Task): "today" | "overdue" | null {
  if (task.done || !task.ecd) return null;
  const key = getEcdDateKey(task.ecd);
  if (!key) return null;
  const today = todayDateKey();
  if (key === today) return "today";
  if (key < today && task.ecd.type === "date") return "overdue";
  return null;
}

export default function TaskCard({
  task,
  isFirst,
  isLast,
  prevTaskDone,
  nextTaskDone,
  goalManaged,
  streak,
  headerName,
  onToggleDone,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: TaskCardProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { label: ecdLabel, recurring: ecdRecurring } = resolveEcd(task);
  const due = dueState(task);
  // The days the streak is measured over, worded as the Goals view words them
  // (a seven-day habit reads "Daily"). Habits always carry a day_of_week ECD.
  const streakDays =
    task.ecd?.type === "day_of_week" ? daysLabel(task.ecd.value) : null;

  // Not-done tasks must stay above done tasks
  const canMoveUp = !isFirst && !(task.done && prevTaskDone === false);
  const canMoveDown = !isLast && !(!task.done && nextTaskDone === true);

  const ecdClass = [
    "task-card__ecd",
    ecdRecurring && "task-card__ecd--recurring",
    !task.ecd && "task-card__ecd--none",
    due && `task-card__ecd--${due}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={`task-card${task.done ? " task-card--done" : ""}`}>
        <div className="task-card__header">
          <button
            className={`task-card__checkbox${task.done ? " task-card__checkbox--checked" : ""}`}
            onClick={() => onToggleDone(task._id)}
            aria-label={task.done ? "Mark as not done" : "Mark as done"}
          >
            {task.done && (
              <svg viewBox="0 0 24 24" className="task-card__check-icon">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>

          <div className="task-card__body">
            <span
              className={`task-card__name${task.done ? " task-card__name--done" : ""}`}
            >
              {task.name}
            </span>
            <span className="task-card__meta">
              <span
                className={ecdClass}
                title={
                  due === "overdue"
                    ? "Overdue"
                    : due === "today"
                      ? "Due today"
                      : undefined
                }
              >
                {due && (
                  <>
                    <span className="task-card__ecd-flag">
                      {due === "today" ? "Today" : "Overdue"}
                    </span>{" "}
                  </>
                )}
                {ecdLabel}
              </span>
              {/* Habit streak, same badge the Goals view shows on the step
                  this task belongs to — counted over the days the task is
                  due, so an untouched off-day never breaks it. */}
              {streak && (
                <span
                  className="task-card__streak"
                  title={`Current streak: ${streak.current} scheduled ${streak.current === 1 ? "day" : "days"} in a row (best ${streak.longest}).${streakDays ? ` Counts only ${streakDays}.` : ""}`}
                >
                  🔥 {streak.current}
                </span>
              )}
              {headerName && (
                <span className="task-card__header-tag">{headerName}</span>
              )}
              {task.notes && (
                <span className="task-card__notes-text">{task.notes}</span>
              )}
            </span>
          </div>

          <div className="task-card__actions">
            <button
              className="task-card__action-btn"
              onClick={() => onMoveUp(task._id)}
              disabled={!canMoveUp}
              aria-label="Move up"
              title="Move up"
            >
              <Icon name="arrow-up" size={15} />
            </button>
            <button
              className="task-card__action-btn"
              onClick={() => onMoveDown(task._id)}
              disabled={!canMoveDown}
              aria-label="Move down"
              title="Move down"
            >
              <Icon name="arrow-down" size={15} />
            </button>
            <button
              className="task-card__action-btn"
              onClick={() => setEditModalOpen(true)}
              aria-label="Edit notes"
              title="Edit notes"
            >
              <Icon name="pencil" size={15} />
            </button>
            <button
              className="task-card__action-btn task-card__action-btn--danger"
              onClick={() => onDelete(task._id)}
              aria-label="Delete task"
              title="Delete"
            >
              <Icon name="trash" size={15} />
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
          goalManaged={goalManaged}
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
