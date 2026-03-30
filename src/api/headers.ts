/**
 * API service for Headers collection.
 *
 * Headers are top-level containers for tasks, each with a unique priority.
 *
 * Endpoints:
 *   GET    /headers          – get all headers sorted by priority ASC
 *   POST   /headers          – create new header (priority auto-assigned)
 *   PUT    /headers/:id      – update header name and/or priority
 *   DELETE /headers/:id      – delete header and all its tasks
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";

// ── Data Models ──────────────────────────────────────────────────────────────

export interface Header {
  _id: string; // MongoDB ObjectId
  name: string; // Header name (required)
  priority: number; // 0-based global priority (0 = highest); auto-managed
}

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateHeaderBody {
  name: string; // Required, non-empty string
}

export interface UpdateHeaderBody {
  name?: string; // Optional, non-empty string
  priority?: number; // Optional, 0-based priority
}

export interface DeleteHeaderResponse {
  deleted: string; // Header ID
  tasksDeleted: number; // Number of tasks deleted
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /headers — returns all headers sorted by priority ASC */
export const getAll = (): Promise<Header[]> => apiFetch<Header[]>("/headers");

/** POST /headers — creates a new header, priority auto-assigned */
export const create = (body: CreateHeaderBody): Promise<Header> =>
  apiFetch<Header>("/headers", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /headers/:id — updates header name and/or priority */
export const update = (id: string, body: UpdateHeaderBody): Promise<Header> =>
  apiFetch<Header>(`/headers/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/** DELETE /headers/:id — deletes header and all its tasks */
export const remove = (id: string): Promise<DeleteHeaderResponse> =>
  apiFetch<DeleteHeaderResponse>(`/headers/${id}`, {
    method: "DELETE",
  });
