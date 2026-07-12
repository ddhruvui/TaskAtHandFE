/**
 * API service for Affirmations collection.
 *
 * An affirmation is a single short line the user reads daily
 * (e.g. "Thank you blessing"). Unrelated to headers/tasks — the
 * Affirmations view is just a flat list with add, edit, and delete.
 *
 * Endpoints:
 *   GET    /affirmations         – get all affirmations sorted by createdAt ASC
 *   POST   /affirmations         – create new affirmation
 *   PUT    /affirmations/:id     – update affirmation text
 *   DELETE /affirmations/:id     – delete affirmation
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";
import type { Affirmation } from "../types";

export type { Affirmation };

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateAffirmationBody {
  name: string; // Required, non-empty string
}

export interface UpdateAffirmationBody {
  name: string; // Required, non-empty string
}

export interface DeleteAffirmationResponse {
  deleted: string; // Affirmation ID
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /affirmations — returns all affirmations sorted by createdAt ASC */
export const getAll = (): Promise<Affirmation[]> =>
  apiFetch<Affirmation[]>("/affirmations");

/** POST /affirmations — creates a new affirmation */
export const create = (body: CreateAffirmationBody): Promise<Affirmation> =>
  apiFetch<Affirmation>("/affirmations", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /affirmations/:id — updates an affirmation's text */
export const update = (
  id: string,
  body: UpdateAffirmationBody,
): Promise<Affirmation> =>
  apiFetch<Affirmation>(`/affirmations/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/** DELETE /affirmations/:id — deletes an affirmation */
export const remove = (id: string): Promise<DeleteAffirmationResponse> =>
  apiFetch<DeleteAffirmationResponse>(`/affirmations/${id}`, {
    method: "DELETE",
  });
