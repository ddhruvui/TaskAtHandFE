import type { Task, ECD } from "../../types";

export interface EditPayload {
  name: string;
  notes: string;
  ecd: ECD | null;
}

export interface TaskCardProps {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  prevTaskDone?: boolean; // Whether the previous task is done
  nextTaskDone?: boolean; // Whether the next task is done
  onToggleDone: (id: string) => void;
  onEdit: (id: string, payload: EditPayload) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}
