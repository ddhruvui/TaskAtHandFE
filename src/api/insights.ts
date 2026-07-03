/**
 * API functions for archive stats and AI insight reports.
 * Endpoints: GET /insights/stats, GET /insights/latest, POST /insights/generate
 */

import { apiFetch } from "./client";
import type { Insight, InsightStats } from "../types";

export async function getStats(days = 28): Promise<InsightStats> {
  return apiFetch<InsightStats>(`/insights/stats?days=${days}`);
}

export async function getLatest(): Promise<Insight> {
  return apiFetch<Insight>("/insights/latest");
}

export async function generate(days?: number): Promise<Insight> {
  return apiFetch<Insight>("/insights/generate", {
    method: "POST",
    body: JSON.stringify(days ? { days } : {}),
  });
}
