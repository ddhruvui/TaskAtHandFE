/**
 * API service for on-call shifts.
 *
 * On-call is **recorded separately and never affects tasks** — the backend
 * cron, archive, stats and insights never read it. The only thing the cron
 * does with it is step 12, which deletes shifts dated before yesterday.
 *
 * Endpoints:
 *   GET    /oncall       – shifts dated yesterday (UTC) onward, by date then start
 *   POST   /oncall       – add a shift (type defaults to "primary")
 *   PUT    /oncall/:id   – partial update, validated as a whole
 *   DELETE /oncall/:id   – delete a shift
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";
import type { OnCallShift, OnCallType } from "../types";

export type { OnCallShift, OnCallType };

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateOnCallBody {
  date: string; // "YYYY-MM-DD", not before yesterday
  start: string; // "HH:mm", 00:00–23:59
  end: string; // "HH:mm", 00:00–24:00; at or before start = overnight
  type?: OnCallType; // default "primary"
  note?: string;
}

export type UpdateOnCallBody = Partial<CreateOnCallBody>;

export interface DeleteOnCallResponse {
  deleted: string; // Shift ID
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /oncall — upcoming shifts (plus yesterday's, which may still be running) */
export const getAll = (): Promise<OnCallShift[]> =>
  apiFetch<OnCallShift[]>("/oncall");

/** POST /oncall — adds a shift; 400 on overlap or a past date */
export const create = (body: CreateOnCallBody): Promise<OnCallShift> =>
  apiFetch<OnCallShift>("/oncall", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /oncall/:id — partial update */
export const update = (
  id: string,
  body: UpdateOnCallBody,
): Promise<OnCallShift> =>
  apiFetch<OnCallShift>(`/oncall/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/** DELETE /oncall/:id */
export const remove = (id: string): Promise<DeleteOnCallResponse> =>
  apiFetch<DeleteOnCallResponse>(`/oncall/${id}`, { method: "DELETE" });
