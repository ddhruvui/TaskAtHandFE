/**
 * API service for LifeEvents collection.
 *
 * A life event is a date that recurs annually (e.g. "Wife's birthday" on
 * "7/3"). Unlike event templates the todo connection is cron-driven: every
 * year on the event's day the backend cron creates a one-time date task
 * named after it under an "Events" header (reused case-insensitively,
 * created otherwise) and links it via todoTaskId. When the nightly cron
 * deletes the done todo task it marks the event done and clears the link —
 * the event itself is never deleted and fires again next year.
 *
 * Clients keep `done` in sync with the linked todo task (toggling either
 * side flips the other; deleting the todo task or its header clears the
 * link). `lastAddedYear` is server-managed — treat it as read-only.
 *
 * Endpoints:
 *   GET    /lifeevents        – get all life events sorted by priority ASC
 *   POST   /lifeevents        – create new life event (priority auto-assigned)
 *   PUT    /lifeevents/:id    – update name, date, done, todoTaskId and/or priority
 *   DELETE /lifeevents/:id    – delete life event (this year's todo task remains)
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";
import type { LifeEvent } from "../types";

export type { LifeEvent };

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateLifeEventBody {
  name: string; // Required, non-empty string
  date: string; // Required, "D/M" (no zero-padding, no year)
}

export interface UpdateLifeEventBody {
  name?: string; // Optional, non-empty string
  date?: string; // Optional, "D/M"; a change re-baselines lastAddedYear server-side
  done?: boolean; // Optional; mirror of the linked todo task's done state
  todoTaskId?: string | null; // Optional; null clears the link
  priority?: number; // Optional, manual reorder across life events; 0-based
}

export interface DeleteLifeEventResponse {
  deleted: string; // Life event ID
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /lifeevents — returns all life events sorted by priority ASC */
export const getAll = (): Promise<LifeEvent[]> =>
  apiFetch<LifeEvent[]>("/lifeevents");

/** POST /lifeevents — creates a new life event, priority auto-assigned */
export const create = (body: CreateLifeEventBody): Promise<LifeEvent> =>
  apiFetch<LifeEvent>("/lifeevents", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /lifeevents/:id — updates name, date, done, todoTaskId and/or priority */
export const update = (
  id: string,
  body: UpdateLifeEventBody,
): Promise<LifeEvent> =>
  apiFetch<LifeEvent>(`/lifeevents/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/** DELETE /lifeevents/:id — deletes a life event (this year's todo task remains) */
export const remove = (id: string): Promise<DeleteLifeEventResponse> =>
  apiFetch<DeleteLifeEventResponse>(`/lifeevents/${id}`, {
    method: "DELETE",
  });
