import type { Todo } from "../TodoCard/TodoCard.types";

export interface Folder {
  id: string;
  name: string;
  color: string; // accent colour for the folder
  todos: Todo[];
}

export interface FolderCardProps {
  folder: Folder;
  onOpen: (folderId: string) => void;
  onDelete: (folderId: string) => void;
}
