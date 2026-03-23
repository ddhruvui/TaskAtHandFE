import type { Todo } from "../TodoCard/TodoCard.types";

export interface Folder {
  id: string;
  name: string;
  allowRecurring?: boolean;
  todos: Todo[];
}

export interface FolderCardProps {
  folder: Folder;
  onOpen: (folderId: string) => void;
  onDelete: (folderId: string) => void;
}
