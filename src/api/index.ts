/**
 * Central export point for all API service modules.
 * Import individual modules for tree-shaking, or use named exports here.
 *
 * Collections:
 *   headers – top-level containers for tasks
 *   tasks   – tasks belonging to headers
 *
 * Base URL comes from VITE_API_BASE_URL (see .env / .env.example).
 */

export * as headersApi from "./headers";
export * as tasksApi from "./tasks";
export * as goalsApi from "./goals";
export { apiFetch } from "./client";
