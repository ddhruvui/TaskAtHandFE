/**
 * API service for Events collection.
 *
 * Events are reusable task bundles (e.g. "Burger Night" with its shopping
 * list). Adding an event to the todo creates its tasks under a header for a
 * chosen date — the template itself is never consumed.
 *
 * Endpoints:
 *   GET    /events           – get all events sorted by name ASC
 *   POST   /events           – create new event
 *   PUT    /events/:id       – update event name and/or task list
 *   DELETE /events/:id       – delete event template
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";
import type { EventTemplate } from "../types";

export type { EventTemplate };

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateEventBody {
  name: string; // Required, non-empty string
  tasks: string[]; // Required, non-empty array of non-empty strings
}

export interface UpdateEventBody {
  name?: string; // Optional, non-empty string
  tasks?: string[]; // Optional, non-empty array of non-empty strings
}

export interface DeleteEventResponse {
  deleted: string; // Event ID
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /events — returns all events sorted by name ASC */
export const getAll = (): Promise<EventTemplate[]> =>
  apiFetch<EventTemplate[]>("/events");

/** POST /events — creates a new event template */
export const create = (body: CreateEventBody): Promise<EventTemplate> =>
  apiFetch<EventTemplate>("/events", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /events/:id — updates event name and/or task list */
export const update = (
  id: string,
  body: UpdateEventBody,
): Promise<EventTemplate> =>
  apiFetch<EventTemplate>(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/** DELETE /events/:id — deletes an event template */
export const remove = (id: string): Promise<DeleteEventResponse> =>
  apiFetch<DeleteEventResponse>(`/events/${id}`, {
    method: "DELETE",
  });
