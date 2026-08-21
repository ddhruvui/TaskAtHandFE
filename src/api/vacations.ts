/**
 * API service for the Vacations collection.
 *
 * A vacation is a period the user booked off. Both dates are **inclusive** and
 * both are mandatory — there is no open-ended "away since Tuesday" state,
 * because a required end date is what lets a trip be booked in advance, and
 * coming home early is an edit.
 *
 * Vacation is a lens on the history, not a pause button: the backend cron runs
 * unchanged and anything ticked off while away still counts. What changes is
 * how the archive is read — missed days become *paused* rather than missed,
 * streaks restart on return, and the AI report is skipped entirely.
 *
 * Endpoints:
 *   GET    /vacations              – all vacations, oldest startDate first
 *   GET    /vacations/status       – is today a vacation day (banner payload)
 *   GET    /vacations/:id/tasks    – undone one-time dated tasks inside the window
 *   POST   /vacations              – book a vacation
 *   PUT    /vacations/:id          – correct its dates or note
 *   DELETE /vacations/:id          – delete it
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";
import type { Vacation, VacationStatus, VacationTask } from "../types";

export type { Vacation, VacationStatus, VacationTask };

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateVacationBody {
  startDate: string; // Required, "YYYY-MM-DD", inclusive
  endDate: string; // Required, "YYYY-MM-DD", inclusive, >= startDate
  note?: string; // Optional free text
}

export interface UpdateVacationBody {
  startDate?: string;
  endDate?: string;
  note?: string;
}

export interface DeleteVacationResponse {
  deleted: string; // Vacation ID
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /vacations — all vacations, oldest startDate first */
export const getAll = (): Promise<Vacation[]> =>
  apiFetch<Vacation[]>("/vacations");

/**
 * GET /vacations/status — whether today is a vacation day, with day counts,
 * upcoming trips, and one that ended in the last 3 days.
 *
 * Read it rather than deriving it: the server measures in UTC days, and a
 * client re-deriving the same thing in local time drifts by a day.
 */
export const getStatus = (): Promise<VacationStatus> =>
  apiFetch<VacationStatus>("/vacations/status");

/**
 * GET /vacations/:id/tasks — the re-date list.
 *
 * Undone one-time `date` tasks scheduled inside the window. Recurring tasks
 * are deliberately absent: they cannot be moved without rewriting their
 * schedule, so those days are exempted instead.
 */
export const getTasks = (id: string): Promise<VacationTask[]> =>
  apiFetch<VacationTask[]>(`/vacations/${id}/tasks`);

/** POST /vacations — books a vacation */
export const create = (body: CreateVacationBody): Promise<Vacation> =>
  apiFetch<Vacation>("/vacations", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /vacations/:id — corrects a vacation's dates or note */
export const update = (
  id: string,
  body: UpdateVacationBody,
): Promise<Vacation> =>
  apiFetch<Vacation>(`/vacations/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/**
 * DELETE /vacations/:id — deletes a vacation, and with it the forgiveness it
 * granted: archive events carry no vacation flag of their own.
 */
export const remove = (id: string): Promise<DeleteVacationResponse> =>
  apiFetch<DeleteVacationResponse>(`/vacations/${id}`, {
    method: "DELETE",
  });
