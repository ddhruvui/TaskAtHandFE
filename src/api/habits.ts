/**
 * API service for the Habits collection.
 *
 * Base path : /api/habbits  (note the double-b — matches the backend spelling)
 *
 * Habits differ from other collections in three ways:
 *  1. No `ecd` date field. Instead, uses ecdDayOfWeek OR ecdDayOfMonth (arrays).
 *  2. `allowRecurring: true` MUST be sent on every create and update request.
 *  3. Chron endpoint marks all done habits as undone (never deletes them).
 *
 * ECD field rules:
 *   ecdDayOfWeek  — array of 1–7  (1 = Monday … 7 = Sunday)
 *   ecdDayOfMonth — array of 1–31 (calendar day)
 *   Exactly one of the two must be supplied on create.
 *   Providing one on update automatically clears the other.
 *   Scalar integers are also accepted by the API (converted to arrays).
 *
 * Endpoints:
 *   GET    /api/habbits          – get all habits, sorted by priority ASC
 *   GET    /api/habbits/:id      – get one
 *   POST   /api/habbits          – create  (201)
 *   PUT    /api/habbits/:id      – update  (200)
 *   DELETE /api/habbits/:id      – delete  (200)
 *   GET    /api/habbits/count    – habit count
 *   DELETE /api/habbits/chron    – mark ALL done habits as undone
 *
 * See: TaskAtHandBE/API_REFERENCE.md – Habits API
 */

import { apiFetch } from "./client";
import type { Todo } from "../components/TodoCard/TodoCard.types";

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
  markedUndoneCount: number;
  movedCount: number;
  message: string;
}

interface CountResponse {
  success: true;
  count: number;
}

// ── Request body shapes ──────────────────────────────────────────────────────

/**
 * Body for POST /api/habbits
 * Exactly one of ecdDayOfWeek or ecdDayOfMonth is required.
 * allowRecurring must be true.
 */
export interface CreateHabitBody {
  name: string; // Required
  notes?: string; // Optional, defaults to ""
  done?: boolean; // Optional, defaults to false
  ecdDayOfWeek?: number | number[]; // 1–7; provide this OR ecdDayOfMonth, not both
  ecdDayOfMonth?: number | number[]; // 1–31; provide this OR ecdDayOfWeek, not both
  allowRecurring: true; // Always required — enables recurring scheduling
}

/**
 * Body for PUT /api/habbits/:id
 * allowRecurring must be true whenever ecdDayOfWeek/ecdDayOfMonth are provided.
 * Setting ecdDayOfWeek clears ecdDayOfMonth (and vice versa).
 */
export type UpdateHabitBody = {
  name?: string;
  notes?: string;
  priority?: number;
  done?: boolean;
  ecdDayOfWeek?: number | number[];
  ecdDayOfMonth?: number | number[];
  allowRecurring?: true;
};

// ── API functions ────────────────────────────────────────────────────────────

/** GET /api/habbits — returns all habits sorted by priority ASC */
export const getAll = (): Promise<Todo[]> =>
  apiFetch<ListResponse>("/api/habbits").then((r) => r.data);

/** GET /api/habbits/:id */
export const getById = (id: string): Promise<Todo> =>
  apiFetch<ItemResponse>(`/api/habbits/${id}`).then((r) => r.data);

/** POST /api/habbits — returns the created habit (201) */
export const create = (body: CreateHabitBody): Promise<Todo> =>
  apiFetch<ItemResponse>("/api/habbits", {
    method: "POST",
    body: JSON.stringify(body),
  }).then((r) => r.data);

/** PUT /api/habbits/:id — returns the updated habit */
export const update = (id: string, body: UpdateHabitBody): Promise<Todo> =>
  apiFetch<ItemResponse>(`/api/habbits/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }).then((r) => r.data);

/** DELETE /api/habbits/:id */
export const remove = (id: string): Promise<DeleteResponse> =>
  apiFetch<DeleteResponse>(`/api/habbits/${id}`, { method: "DELETE" });

/** GET /api/habbits/count */
export const count = (): Promise<number> =>
  apiFetch<CountResponse>("/api/habbits/count").then((r) => r.count);

/**
 * DELETE /api/habbits/chron
 * Marks ALL done habits as undone (regardless of ECD).
 * Any habit whose ECD day matches today is moved to lowest priority.
 */
export const chron = (): Promise<ChronResponse> =>
  apiFetch<ChronResponse>("/api/habbits/chron", { method: "DELETE" });
