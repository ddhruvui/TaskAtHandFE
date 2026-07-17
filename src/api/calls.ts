/**
 * API service for Calls collection.
 *
 * A call is a person the user must ring biweekly (twice a month) or
 * monthly. Unrelated to headers/tasks — the Calls view is a flat list
 * split into Biweekly and Monthly sections. The backend cron resets
 * `done` for biweekly calls on the 15th and for ALL calls on the last
 * day of the month.
 *
 * Endpoints:
 *   GET    /calls         – get all calls sorted by createdAt ASC
 *   POST   /calls         – create new call
 *   PUT    /calls/:id     – update call name/frequency/done
 *   DELETE /calls/:id     – delete call
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";
import type { Call, CallFrequency } from "../types";

export type { Call, CallFrequency };

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateCallBody {
  name: string; // Required, non-empty string
  frequency: CallFrequency; // Required, "biweekly" | "monthly"
}

export interface UpdateCallBody {
  name?: string; // Non-empty string
  frequency?: CallFrequency;
  done?: boolean; // true stamps doneAt, false clears it
}

export interface DeleteCallResponse {
  deleted: string; // Call ID
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /calls — returns all calls sorted by createdAt ASC */
export const getAll = (): Promise<Call[]> => apiFetch<Call[]>("/calls");

/** POST /calls — creates a new call */
export const create = (body: CreateCallBody): Promise<Call> =>
  apiFetch<Call>("/calls", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /calls/:id — updates a call's name, frequency, and/or done state */
export const update = (id: string, body: UpdateCallBody): Promise<Call> =>
  apiFetch<Call>(`/calls/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/** DELETE /calls/:id — deletes a call */
export const remove = (id: string): Promise<DeleteCallResponse> =>
  apiFetch<DeleteCallResponse>(`/calls/${id}`, {
    method: "DELETE",
  });
