/**
 * API service for Goals collection.
 *
 * A goal is a long-term aim (e.g. "Improve Health") with an ordered backlog
 * of small steps/habits built one at a time. Starting a step creates a daily
 * task under the "One Step At A Time" header — the goal itself only tracks
 * each step's status (pending → active → under_progress). Under-progress
 * habits are lifelong: their daily task stays until the step is paused.
 *
 * Endpoints:
 *   GET    /goals           – get all goals sorted by name ASC
 *   POST   /goals           – create new goal
 *   PUT    /goals/:id       – update goal name and/or steps (steps replaced wholesale)
 *   DELETE /goals/:id       – delete goal
 *
 * See: API_REFERENCE.md
 */

import { apiFetch } from "./client";
import type { Goal, GoalStep } from "../types";

export type { Goal, GoalStep };

// ── Request body shapes ──────────────────────────────────────────────────────

export interface CreateGoalBody {
  name: string; // Required, non-empty string
  steps?: GoalStep[]; // Optional; step status defaults to "pending" server-side
}

export interface UpdateGoalBody {
  name?: string; // Optional, non-empty string
  steps?: GoalStep[]; // Optional; replaces the whole list (empty array clears)
}

export interface DeleteGoalResponse {
  deleted: string; // Goal ID
}

// ── API functions ────────────────────────────────────────────────────────────

/** GET /goals — returns all goals sorted by name ASC */
export const getAll = (): Promise<Goal[]> => apiFetch<Goal[]>("/goals");

/** POST /goals — creates a new goal */
export const create = (body: CreateGoalBody): Promise<Goal> =>
  apiFetch<Goal>("/goals", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** PUT /goals/:id — updates goal name and/or steps */
export const update = (id: string, body: UpdateGoalBody): Promise<Goal> =>
  apiFetch<Goal>(`/goals/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

/** DELETE /goals/:id — deletes a goal */
export const remove = (id: string): Promise<DeleteGoalResponse> =>
  apiFetch<DeleteGoalResponse>(`/goals/${id}`, {
    method: "DELETE",
  });
