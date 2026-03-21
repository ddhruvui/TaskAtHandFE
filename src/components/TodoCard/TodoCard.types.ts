export interface Todo {
  id: string;
  name: string;
  notes: string;
  done: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  ecd: string; // Expected Completion Date
}

export interface TodoCardProps {
  todo: Todo;
  onToggleDone: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onPriorityChange: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
}
