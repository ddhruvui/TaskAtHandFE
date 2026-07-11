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
  doneAt?: string | null; // ISO 8601 timestamp of completion (null if not done)
  ecd: ECD | null; // Expected Completion Date (optional)
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

export interface EventTemplate {
  _id: string; // MongoDB ObjectId
  name: string; // Event name (required), e.g. "Burger Night"
  tasks: string[]; // Task names to add to the todo when the event is scheduled
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ── Goals (habit backlogs built one step at a time) ─────────────────────────

// Legacy values ("active", "achieved") may still come back from old data;
// clients treat anything non-pending as under progress and the backend
// normalizes them to "under_progress" on the next write.
export type GoalStepStatus = "pending" | "under_progress";

export interface GoalStep {
  name: string; // Step/habit name (required), e.g. "Wake up at 6"
  status: GoalStepStatus; // pending = backlog/paused, under_progress = daily habit in play (lifelong)
}

export interface Goal {
  _id: string; // MongoDB ObjectId
  name: string; // Goal name (required), e.g. "Improve Health"
  steps: GoalStep[]; // Ordered habit backlog (may be empty)
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ── Insights (archive stats + AI reports) ───────────────────────────────────

export interface HabitStat {
  taskName: string;
  headerName: string | null;
  scheduledDays: string[];
  scheduled: number;
  completed: number;
  completionRate: number; // 0-100
  currentStreak: number;
  longestStreak: number;
  missedByDow: Record<string, number>;
  recentResults: { dueDate: string; completed: boolean }[];
}

export interface InsightStats {
  periodDays: number;
  eventCount: number;
  habits: HabitStat[];
  recurringTasks: {
    taskName: string;
    headerName: string | null;
    ecdType: string;
    scheduled: number;
    completed: number;
    completionRate: number;
  }[];
  oneTimeTasks: {
    completedCount: number;
    avgSlippageDays: number | null;
    recent: {
      taskName: string;
      headerName: string | null;
      plannedFor: string | null;
      doneAt: string | null;
      slippageDays: number | null;
    }[];
  };
  reschedules: {
    taskName: string;
    headerName: string | null;
    total: number;
    pushedLater: number;
  }[];
  byHeader: Record<
    string,
    { completed: number; missed: number; reschedules: number }
  >;
}

export interface InsightReport {
  summary: string;
  habitsOnTrack: string[];
  habitsSlipping: string[];
  taskInsights: string[];
  procrastinationFlags: string[];
  suggestions: string[];
}

export interface Insight {
  _id: string;
  generatedAt: string;
  periodDays: number;
  model?: string;
  report: InsightReport;
}
