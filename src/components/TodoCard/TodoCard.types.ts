export interface Todo {
  _id: string; // MongoDB ObjectId
  name: string;
  notes: string;
  done: boolean;
  priority: number; // 0-based (0 = highest priority)
  createdAt: string;
  updatedAt: string;
  ecd: string | null; // Expected Completion Date (ISO 8601). null for recurring todos.
  ecdDayOfWeek?: number[]; // 1–7 each, recurring weekly: 1=Monday … 7=Sunday
  ecdDayOfMonth?: number[]; // 1–31 each, recurring monthly: days of the calendar month
}

export interface EditPayload {
  notes: string;
  ecd: string | null;
  ecdDayOfWeek?: number[];
  ecdDayOfMonth?: number[];
}

export interface TodoCardProps {
  todo: Todo;
  isFirst: boolean;
  isLast: boolean;
  prevTodoDone?: boolean; // Whether the previous todo is done
  nextTodoDone?: boolean; // Whether the next todo is done
  allowRecurring: boolean;
  onToggleDone: (id: string) => void;
  onEdit: (id: string, payload: EditPayload) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}
