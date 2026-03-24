/**
 * API service for standard item collections:
 *   todos · office · dreams · workondreams · events
 *
 * All five collections share the same Item model:
 *   _id, name, notes, priority (0-based), done, ecd, createdAt, updatedAt
 *
 * Key differences by collection:
 *   - todos / office / dreams / workondreams : ecd is set at creation only
 *     (not updatable via PUT)
 *   - events : ecd IS updatable via PUT; marking done adds 1 year to ecd
 *
 * Endpoints (using "todos" as example):
 *   GET    /api/todos          – get all, sorted by priority ASC
 *   GET    /api/todos/:id      – get one
 *   POST   /api/todos          – create  (201)
 *   PUT    /api/todos/:id      – update  (200)
 *   DELETE /api/todos/:id      – delete  (200)
 *   GET    /api/todos/count    – item count
 *   DELETE /api/todos/chron    – delete done items + move overdue to lowest priority
 *
 * See: TaskAtHandBE/API_REFERENCE.md
 */

import { apiFetch } from "./client";
import type { Todo } from "../components/TodoCard/TodoCard.types";
import type { ApiCollection } from "../components/FolderCard/FolderCard.types";

// ── Response shapes ──────────────────────────────────────────────────────────

interface ListResponse {
  success: true;
  count: number;
  data: Todo[];
}

interface ItemResponse {
  success: true;
  data: Todo;
  message: string;
}

interface DeleteResponse {
  success: true;
  message: string;
}

interface ChronResponse {
  success: true;
  deletedCount?: number; // todos / office / dreams / workondreams
  movedCount?: number; // todos / office / dreams / workondreams
  markedUndoneCount?: number; // events
  message: string;
}

interface CountResponse {
  success: true;
  count: number;
}

// ── Request body shapes ──────────────────────────────────────────────────────

/** Body for POST /api/{collection} */
export interface CreateItemBody {
  name: string; // Required
  notes?: string; // Optional, defaults to ""
  done?: boolean; // Optional, defaults to false
  ecd?: string | null; // Optional ISO 8601 date string
}

/**
 * Body for PUT /api/{collection}/:id
 *
 * IMPORTANT:
 *  - todos / office / dreams / workondreams : do NOT include `ecd` (read-only after creation)
 *  - events : `ecd` may be included (fully updatable)
 *  - done=true  → item moves to end of list (priority becomes max)
 *  - done=false → item moves to top of list (priority becomes 0)
 *  - changing `priority` auto-reorders all other items
 */
export interface UpdateItemBody {
  name?: string;
  notes?: string;
  priority?: number;
  done?: boolean;
  ecd?: string | null; // events only
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /api/{collection} — returns all items sorted by priority ASC */
export const getAll = (collection: ApiCollection): Promise<Todo[]> =>
  apiFetch<ListResponse>(`/api/${collection}`).then((r) => r.data);

/** GET /api/{collection}/:id */
export const getById = (collection: ApiCollection, id: string): Promise<Todo> =>
  apiFetch<ItemResponse>(`/api/${collection}/${id}`).then((r) => r.data);

/** POST /api/{collection} — returns the created item (201) */
export const create = (
  collection: ApiCollection,
  body: CreateItemBody,
): Promise<Todo> =>
  apiFetch<ItemResponse>(`/api/${collection}`, {
    method: "POST",
    body: JSON.stringify(body),
  }).then((r) => r.data);

/** PUT /api/{collection}/:id — returns the updated item */
export const update = (
  collection: ApiCollection,
  id: string,
  body: UpdateItemBody,
): Promise<Todo> =>
  apiFetch<ItemResponse>(`/api/${collection}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }).then((r) => r.data);

/** DELETE /api/{collection}/:id */
export const remove = (
  collection: ApiCollection,
  id: string,
): Promise<DeleteResponse> =>
  apiFetch<DeleteResponse>(`/api/${collection}/${id}`, { method: "DELETE" });

/** GET /api/{collection}/count */
export const count = (collection: ApiCollection): Promise<number> =>
  apiFetch<CountResponse>(`/api/${collection}/count`).then((r) => r.count);

/**
 * DELETE /api/{collection}/chron
 * todos / office / dreams / workondreams : deletes all done items, moves overdue to lowest priority
 * events : marks done events whose ecd falls in the current week as undone (never deletes)
 */
export const chron = (collection: ApiCollection): Promise<ChronResponse> =>
  apiFetch<ChronResponse>(`/api/${collection}/chron`, { method: "DELETE" });
