/**
 * Central export point for all API service modules.
 * Import individual modules for tree-shaking, or use named exports here.
 *
 * Collections:
 *   items   – todos · office · dreams · workondreams · events
 *   habits  – habbits (recurring, day-of-week / day-of-month)
 *
 * Base URL comes from VITE_API_BASE_URL (see .env / .env.example).
 */

export * as itemsApi from "./items";
export * as habitsApi from "./habits";
export { apiFetch } from "./client";
