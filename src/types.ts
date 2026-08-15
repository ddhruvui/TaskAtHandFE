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

export type DayOfWeek = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface ECDDayOfWeek {
  type: "day_of_week";
  value: DayOfWeek[]; // Non-empty array
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
  projectId: string | null; // Project this header mirrors; server keeps these ordered
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

// ── Life Events (annually recurring dates, added to the todo by the cron) ───

export interface LifeEvent {
  _id: string; // MongoDB ObjectId
  name: string; // Life event name (required), e.g. "Wife's birthday"
  date: string; // "D/M" (no zero-padding, no year), e.g. "7/3" — recurs annually
  lastAddedYear: number; // Server-managed: year of the last occurrence the cron consumed
  done: boolean; // This year's occurrence completed
  todoTaskId: string | null; // _id of the linked todo Task while one exists
  priority: number; // Display order, contiguous 0..n-1 (new events append at end)
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
  status: GoalStepStatus; // pending = backlog/paused, under_progress = habit in play (lifelong)
  // Weekdays the habit is expected on; becomes the started step's day_of_week
  // ECD, so the streak only counts these days. Optional because steps stored
  // before the field existed read back without it — treat that as every day
  // (`stepDays` in utils/goalSync).
  days?: DayOfWeek[];
}

export interface Goal {
  _id: string; // MongoDB ObjectId
  name: string; // Goal name (required), e.g. "Improve Health"
  steps: GoalStep[]; // Ordered habit backlog (may be empty)
  priority: number; // Display order, contiguous 0..n-1 (new goals append at end)
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ── Projects (long-term projects, built step by step) ───────────────────────

export interface ProjectTask {
  name: string; // Task/step name (required), e.g. "get data from EODHD"
  notes: string; // Free-text notes (default ""); mirrored onto the linked todo task
  date: string | null; // "YYYY-MM-DD" target date or null; a date mirrors the task into the todo
  done: boolean; // Completion status; done tasks always sort to the bottom
  todoTaskId: string | null; // _id of the linked todo Task while one exists
}

export interface Project {
  _id: string; // MongoDB ObjectId
  name: string; // Project name (required), e.g. "Automated Stock Market"
  priority: number; // 0-based global priority (0 = highest); auto-managed
  tasks: ProjectTask[]; // Ordered task list (may be empty); undone before done
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ── Affirmations (short daily lines) ────────────────────────────────────────

export interface Affirmation {
  _id: string; // MongoDB ObjectId
  name: string; // Affirmation text (required), e.g. "Thank you blessing"
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ── Calls (people to call biweekly or monthly) ──────────────────────────────

export type CallFrequency = "biweekly" | "monthly";

export interface Call {
  _id: string; // MongoDB ObjectId
  name: string; // Person to call (required), e.g. "Grandma"
  frequency: CallFrequency; // biweekly = call twice a month, monthly = once
  done: boolean; // Called this cycle (reset by the backend cron)
  doneAt: string | null; // ISO 8601 timestamp of the call (null if not called)
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
    // Finished on or before the planned date vs. after it. Optional: reports
    // stored before the on-time split don't carry them.
    onTimeCount?: number;
    lateCount?: number;
    // Average days *late* — early and on-the-day completions count as 0
    avgSlippageDays: number | null;
    recent: {
      taskName: string;
      headerName: string | null;
      plannedFor: string | null;
      doneAt: string | null;
      slippageDays: number | null; // negative = finished early
      onTime?: boolean | null;
    }[];
  };
  reschedules: {
    taskName: string;
    headerName: string | null;
    total: number;
    pushedLater: number;
    pushedLaterWithReason: number;
    pushedLaterNoReason: number;
    reasons: string[];
  }[];
  byHeader: Record<
    string,
    { completed: number; missed: number; reschedules: number }
  >;
  calls: CallStat[];
}

export interface CallStat {
  callName: string;
  frequency: CallFrequency;
  scheduled: number;
  completed: number;
  completionRate: number; // 0-100
  currentMissStreak: number;
  recentResults: { dueDate: string; completed: boolean }[];
}

export interface InsightReport {
  summary: string;
  habitsOnTrack: string[];
  habitsSlipping: string[];
  taskInsights: string[];
  procrastinationFlags: string[];
  // Absent from reports generated before the Calls feature
  callReminders?: string[];
  suggestions: string[];
}

export interface Insight {
  _id: string;
  generatedAt: string;
  periodDays: number;
  model?: string;
  report: InsightReport;
}
