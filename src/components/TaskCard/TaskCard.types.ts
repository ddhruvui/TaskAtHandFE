import type { Task, ECD } from "../../types";

export interface EditPayload {
  name: string;
  notes: string;
  ecd: ECD | null;
  /** Optional postpone reason, set only when the ecd change pushes a date later. */
  reason?: string;
}

export interface TaskCardProps {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  prevTaskDone?: boolean; // Whether the previous task is done
  nextTaskDone?: boolean; // Whether the next task is done
  /**
   * True for daily habit tasks under "One Step At A Time". Goal steps link to
   * their todo task by name, so the edit modal locks name and schedule (notes
   * and done stay editable) to keep the goal↔todo link from drifting.
   */
  goalManaged?: boolean;
  onToggleDone: (id: string) => void;
  onEdit: (id: string, payload: EditPayload) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}
