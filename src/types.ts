/**
 * Shared TypeScript types for the TaskAtHand frontend.
 * These match the data models from API_REFERENCE.md and todo_app_structure.md.
 */

// ── ECD (Expected Completion Date) types ────────────────────────────────────

export type ECDType = "date" | "day_of_week" | "day_of_month" | "day_of_year";

export interface ECDDate {
  type: "date";
  value: string; // YYYY-MM-DD
}

export interface ECDDayOfWeek {
  type: "day_of_week";
  value: ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[]; // Non-empty array
}

export interface ECDDayOfMonth {
  type: "day_of_month";
  value: number[]; // 1-31, non-empty array
}

export interface ECDDayOfYear {
  type: "day_of_year";
  value: string; // D/M/YYYY format
}

export type ECD = ECDDate | ECDDayOfWeek | ECDDayOfMonth | ECDDayOfYear;

// ── Data Models ──────────────────────────────────────────────────────────────

export interface Header {
  _id: string; // MongoDB ObjectId
  name: string; // Header name (required)
  priority: number; // 0-based global priority (0 = highest); auto-managed
}

export interface Task {
  _id: string; // MongoDB ObjectId
  name: string; // Task name (required)
  notes: string; // Additional notes (default: "")
  headerId: string; // Parent Header ObjectId (required, immutable)
  priority: number; // 0-based priority within the header; auto-managed
  done: boolean; // Completion status (default: false)
  ecd: ECD | null; // Expected Completion Date (optional)
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
