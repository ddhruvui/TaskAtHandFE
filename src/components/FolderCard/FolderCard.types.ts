import type { Todo } from "../TodoCard/TodoCard.types";

/**
 * Maps each frontend folder to its backend API collection.
 * Note: "habbits" matches the backend spelling (double-b).
 *
 * Collection behaviours (see API_REFERENCE.md):
 *   todos / office / dreams / workondreams : ecd set at creation, NOT updatable via PUT
 *   events      : ecd updatable via PUT; marking done adds 1 year to ecd
 *   habbits     : no ecd — uses ecdDayOfWeek or ecdDayOfMonth; chron marks undone (never deletes)
 */
export type ApiCollection =
  | "todos"
  | "office"
  | "dreams"
  | "workondreams"
  | "events"
  | "habbits";

export interface Folder {
  id: string;
  name: string;
  /** Backend API collection this folder reads/writes from */
  collection: ApiCollection;
  /** When true, tasks in this folder support ecdDayOfWeek / ecdDayOfMonth recurring rules */
  allowRecurring?: boolean;
  todos: Todo[];
}

export interface FolderCardProps {
  folder: Folder;
  onOpen: (folderId: string) => void;
  onDelete: (folderId: string) => void;
}
