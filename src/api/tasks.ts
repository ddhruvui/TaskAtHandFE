/**
 * API service for Tasks collection.
 *
 * Tasks belong to a Header and are scoped by headerId.
 * Each task has a priority scoped per header (0-based).
 *
 * Endpoints:
 *   GET    /tasks?headerId=:id  – get all tasks for a header
 *   POST   /tasks               – create new task
 *   PUT    /tasks/:id           – update task
 *   DELETE /tasks/:id           – delete task
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";

// ── Data Models ──────────────────────────────────────────────────────────────

/** ECD (Expected Completion Date) types */
export type ECDType = "date" | "day_of_week" | "day_of_month" | "day_of_year";

export interface ECDDate {
  type: "date";
  value: string; // YYYY-MM-DD
}

export interface ECDDayOfWeek {
  type: "day_of_week";
  value: ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[]; // Non-empty array
}

export interface ECDDayOfMonth {
  type: "day_of_month";
  value: number[]; // 1-31, non-empty array
}

export interface ECDDayOfYear {
  type: "day_of_year";
  value: string; // D/M/YYYY format
}

export type ECD = ECDDate | ECDDayOfWeek | ECDDayOfMonth | ECDDayOfYear;

export interface Task {
  _id: string; // MongoDB ObjectId
  name: string; // Task name (required)
  notes: string; // Additional notes (default: "")
  headerId: string; // Parent Header ObjectId (required, immutable)
  priority: number; // 0-based priority within the header; auto-managed
  done: boolean; // Completion status (default: false)
  ecd: ECD | null; // Expected Completion Date (optional)
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateTaskBody {
  name: string; // Required, non-empty string
  headerId: string; // Required, must reference an existing Header
  notes?: string; // Optional, default ""
  ecd?: ECD | null; // Optional, default null
}

export interface UpdateTaskBody {
  name?: string; // Optional, non-empty string
  notes?: string; // Optional
  ecd?: ECD | null; // Optional; null clears it
  done?: boolean; // Optional, triggers automatic priority reorder
  priority?: number; // Optional, manual reorder within header; 0-based
}

export interface DeleteTaskResponse {
  deleted: string; // Task ID
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /tasks?headerId=:id — returns all tasks for a header sorted by priority ASC */
export const getAll = (headerId: string): Promise<Task[]> =>
  apiFetch<Task[]>(`/tasks?headerId=${headerId}`);

/** POST /tasks — creates a new task, priority auto-assigned */
export const create = (body: CreateTaskBody): Promise<Task> =>
  apiFetch<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /tasks/:id — updates a task */
export const update = (id: string, body: UpdateTaskBody): Promise<Task> =>
  apiFetch<Task>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/**
 * DELETE /tasks/:id — deletes a task.
 * When deleting an *undone* task, pass `reason`: the backend archives it as a
 * `task_deleted` event so the AI insights can analyze why tasks are abandoned.
 */
export const remove = (
  id: string,
  reason?: string,
): Promise<DeleteTaskResponse> =>
  apiFetch<DeleteTaskResponse>(`/tasks/${id}`, {
    method: "DELETE",
    ...(reason !== undefined ? { body: JSON.stringify({ reason }) } : {}),
  });
