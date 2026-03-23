export interface Todo {
  id: string;
  name: string;
  notes: string;
  done: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  ecd: string; // Expected Completion Date (ISO string, used when no recurring rule is set)
  ecdDayOfWeek?: number[]; // 1–7 each, recurring weekly: 1=Monday … 7=Sunday
  ecdDayOfMonth?: number[]; // 1–31 each, recurring monthly: days of the calendar month
}

export interface EditPayload {
  notes: string;
  ecd: string;
  ecdDayOfWeek?: number[];
  ecdDayOfMonth?: number[];
}

export interface TodoCardProps {
  todo: Todo;
  isFirst: boolean;
  isLast: boolean;
  allowRecurring: boolean;
  onToggleDone: (id: string) => void;
  onEdit: (id: string, payload: EditPayload) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}
