import { useState, useEffect, useCallback } from "react";
import type { DayOfWeek, Goal, GoalStep, GoalStepStatus } from "../../types";
import * as goalsApi from "../../api/goals";
import * as headersApi from "../../api/headers";
import * as tasksApi from "../../api/tasks";
import * as insightsApi from "../../api/insights";
import {
  ONE_STEP_HEADER,
  daysLabel,
  daysToEcd,
  isOneStepHeaderName,
  stepDays,
} from "../../utils/goalSync";
import { GoalModal } from "../GoalModal";
import { AddStepModal } from "../AddStepModal";
import { StepDaysModal } from "../StepDaysModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
// Step rows reuse the todo's row styling (.task-card*) so the two lists stay
// visually identical from one source. Imported explicitly rather than relying
// on TaskCard being mounted elsewhere in the tree.
import "../TaskCard/TaskCard.css";
import "./GoalsPanel.css";

/** Current/best streak of a started step, keyed by lower-cased step name. */
type StreakMap = Record<string, { current: number; longest: number }>;

/**
 * Under-progress steps sort above the pending backlog (stable within each
 * group) — the goals-side mirror of the todo's undone-above-done barrier.
 * Every step mutation persists this order, and the render applies it too so
 * legacy goals stored unsorted display correctly before their next write.
 */
function sortSteps(steps: GoalStep[]): GoalStep[] {
  return [
    ...steps.filter((s) => s.status !== "pending"),
    ...steps.filter((s) => s.status === "pending"),
  ];
}

interface GoalsPanelProps {
  /** Called after the todo was touched (task added/removed), so it can reload. */
  onTasksChanged: () => void;
}

export default function GoalsPanel({ onTasksChanged }: GoalsPanelProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [streaks, setStreaks] = useState<StreakMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyStep, setBusyStep] = useState<string | null>(null);

  // Modal states. There is no edit mode: the goal heading has no Edit button,
  // so a goal is created here and afterwards only its steps change.
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [addStepGoal, setAddStepGoal] = useState<Goal | null>(null);
  const [addingStep, setAddingStep] = useState(false);
  const [deleteStepTarget, setDeleteStepTarget] = useState<{
    goal: Goal;
    index: number;
  } | null>(null);
  // Day picker, opened either to start a pending step or to reschedule a
  // started one. `mode` decides which of the two the confirm handler runs.
  const [daysTarget, setDaysTarget] = useState<{
    goal: Goal;
    index: number;
    mode: "start" | "edit";
  } | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      const all = await goalsApi.getAll();
      setGoals(all);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, []);

  /**
   * Habit streaks for the started steps, from the same archive stats the
   * Insights view reads. The archive only records a result on days the task's
   * ECD covers, so a streak here counts scheduled days: a Mon/Wed/Fri habit
   * survives an untouched Tuesday.
   *
   * Habits are matched by name under the "One Step At A Time" header — the
   * same case-insensitive link the rest of the goal↔todo sync uses. Failure is
   * silent: stats are decoration on this view, not the reason it exists.
   */
  const loadStreaks = useCallback(async () => {
    try {
      const stats = await insightsApi.getStats();
      const map: StreakMap = {};
      for (const habit of stats.habits) {
        if (!habit.headerName || !isOneStepHeaderName(habit.headerName)) continue;
        map[habit.taskName.trim().toLowerCase()] = {
          current: habit.currentStreak,
          longest: habit.longestStreak,
        };
      }
      setStreaks(map);
    } catch {
      setStreaks(null);
    }
  }, []);

  useEffect(() => {
    loadGoals();
    loadStreaks();
  }, [loadGoals, loadStreaks]);

  /* ── Goal CRUD ── */

  const handleSaveGoal = async (draft: {
    name: string;
    stepNames: string[];
  }) => {
    try {
      await goalsApi.create({
        name: draft.name,
        steps: draft.stepNames.map((name) => ({
          name,
          status: "pending" as const,
        })),
      });
      await loadGoals();
      setAddGoalOpen(false);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /**
   * Append one step to a goal's backlog — the goals-side equivalent of adding
   * a task to a header. New steps start pending, exactly as they do when
   * typed into the goal modal's step list.
   */
  const handleAddStep = async (name: string) => {
    if (!addStepGoal) return;
    setAddingStep(true);
    try {
      await goalsApi.update(addStepGoal._id, {
        steps: [...addStepGoal.steps, { name, status: "pending" as const }],
      });
      await loadGoals();
      setAddStepGoal(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAddingStep(false);
    }
  };

  /** Reorder goals; the server shifts the others to keep 0..n-1 contiguous. */
  const handleMoveGoal = async (goal: Goal, delta: -1 | 1) => {
    try {
      await goalsApi.update(goal._id, { priority: goal.priority + delta });
      await loadGoals();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      await loadGoals();
    }
  };

  /** Reorder steps inside a goal — the step list is replaced wholesale.
   * Indices address the sorted (started-first) list the panel renders, and
   * moves never cross the started/pending barrier. */
  const handleMoveStep = async (
    goal: Goal,
    stepIndex: number,
    delta: -1 | 1,
  ) => {
    const steps = sortSteps(goal.steps);
    const target = stepIndex + delta;
    if (target < 0 || target >= steps.length) return;
    const crossesBarrier =
      (steps[stepIndex].status !== "pending") !==
      (steps[target].status !== "pending");
    if (crossesBarrier) return;
    [steps[stepIndex], steps[target]] = [steps[target], steps[stepIndex]];
    setBusyStep(`${goal._id}:${stepIndex}`);
    try {
      await goalsApi.update(goal._id, { steps });
      await loadGoals();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyStep(null);
    }
  };

  /**
   * Remove a step from the backlog. An under-progress step still owns a daily
   * task under "One Step At A Time", so drop that first — same cleanup Pause
   * does, otherwise the todo keeps an orphan habit no goal points at.
   */
  const handleDeleteStep = async () => {
    if (!deleteStepTarget) return;
    const { goal, index } = deleteStepTarget;
    const steps = sortSteps(goal.steps);
    const step = steps[index];
    setBusyStep(`${goal._id}:${index}`);
    try {
      if (step.status !== "pending") {
        const match = await findStepTask(step.name);
        if (match) await tasksApi.remove(match._id);
      }
      await goalsApi.update(goal._id, {
        steps: steps.filter((_, i) => i !== index),
      });
      await loadGoals();
      setDeleteStepTarget(null);
      setError(null);
      if (step.status !== "pending") onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyStep(null);
    }
  };

  const handleDeleteGoal = async () => {
    if (!deleteTarget) return;
    try {
      await goalsApi.remove(deleteTarget._id);
      setGoals((prev) => prev.filter((g) => g._id !== deleteTarget._id));
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* ── Step transitions ──
   * A step is under progress exactly while its daily task lives under the
   * "One Step At A Time" header. Start creates the task on the weekdays the
   * user picked (header reused when one exists, created otherwise — same
   * find-or-create pattern as event scheduling) and the habit is kept for
   * life; Pause removes the task and shelves the step. Deleting the task from
   * the todo pauses the step too (see utils/goalSync). */

  const findOneStepHeader = async () => {
    const all = await headersApi.getAll();
    return all.find((h) => isOneStepHeaderName(h.name));
  };

  /** The started step's task under "One Step At A Time", matched by name. */
  const findStepTask = async (stepName: string) => {
    const header = await findOneStepHeader();
    if (!header) return null;
    const tasks = await tasksApi.getAll(header._id);
    return (
      tasks.find(
        (t) => t.name.trim().toLowerCase() === stepName.trim().toLowerCase(),
      ) ?? null
    );
  };

  const patchStep = async (
    goal: Goal,
    stepIndex: number,
    patch: Partial<GoalStep>,
  ) => {
    const steps = sortSteps(goal.steps).map((s, i) =>
      i === stepIndex ? { ...s, ...patch } : s,
    );
    // Re-sort so the step joins its new group (a started step rises to the
    // under-progress block, a paused one drops back to the backlog)
    await goalsApi.update(goal._id, { steps: sortSteps(steps) });
  };

  const updateStepStatus = (
    goal: Goal,
    stepIndex: number,
    status: GoalStepStatus,
  ) => patchStep(goal, stepIndex, { status });

  /**
   * Begin a step on the chosen weekdays. The task's ECD is set from `days`
   * even when the task already exists, so a re-start can't leave the todo on
   * an older schedule than the goal claims.
   */
  const handleStartStep = async (
    goal: Goal,
    stepIndex: number,
    days: DayOfWeek[],
  ) => {
    const step = sortSteps(goal.steps)[stepIndex];
    setBusyStep(`${goal._id}:${stepIndex}`);
    try {
      const header =
        (await findOneStepHeader()) ??
        (await headersApi.create({ name: ONE_STEP_HEADER }));
      const existing = await tasksApi.getAll(header._id);
      const alreadyThere = existing.find(
        (t) => t.name.trim().toLowerCase() === step.name.trim().toLowerCase(),
      );
      if (alreadyThere) {
        await tasksApi.update(alreadyThere._id, { ecd: daysToEcd(days) });
      } else {
        await tasksApi.create({
          name: step.name,
          headerId: header._id,
          notes: `Step towards "${goal.name}"`,
          ecd: daysToEcd(days),
        });
      }
      await patchStep(goal, stepIndex, { status: "under_progress", days });
      await loadGoals();
      setDaysTarget(null);
      setError(null);
      setNotice(
        `Started "${step.name}" — under progress every ${days.join(", ")} in "${ONE_STEP_HEADER}".`,
      );
      onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyStep(null);
    }
  };

  /**
   * Reschedule a step already under progress: the goal keeps the new days and
   * its task's ECD is rewritten to match, so the streak starts counting the
   * new set from the next nightly archive run.
   */
  const handleChangeDays = async (
    goal: Goal,
    stepIndex: number,
    days: DayOfWeek[],
  ) => {
    const step = sortSteps(goal.steps)[stepIndex];
    setBusyStep(`${goal._id}:${stepIndex}`);
    try {
      const task = await findStepTask(step.name);
      if (task) await tasksApi.update(task._id, { ecd: daysToEcd(days) });
      await patchStep(goal, stepIndex, { days });
      await loadGoals();
      setDaysTarget(null);
      setError(null);
      setNotice(
        `"${step.name}" is now due every ${days.join(", ")} — its streak counts those days.`,
      );
      onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyStep(null);
    }
  };

  /** under_progress → pending: back to the backlog, daily task removed. */
  const handlePauseStep = async (goal: Goal, stepIndex: number) => {
    const step = sortSteps(goal.steps)[stepIndex];
    setBusyStep(`${goal._id}:${stepIndex}`);
    try {
      const match = await findStepTask(step.name);
      if (match) await tasksApi.remove(match._id);
      await updateStepStatus(goal, stepIndex, "pending");
      await loadGoals();
      setError(null);
      setNotice(
        `"${step.name}" paused — moved back to the backlog and removed from the daily list.`,
      );
      onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyStep(null);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="goals-panel">
        <p className="empty-message">Loading goals…</p>
      </div>
    );
  }

  return (
    <div className="goals-panel">
      {error && <p className="empty-message">Action failed: {error}</p>}
      {notice && (
        <p className="goals-panel__notice">
          {notice}{" "}
          <button
            className="goals-panel__notice-dismiss"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </p>
      )}

      <div className="goals-panel__toolbar">
        <AddButton ariaLabel="Add goal" onClick={() => setAddGoalOpen(true)} />
      </div>

      {goals.map((goal, idx) => {
        // Anything non-pending counts (covers legacy statuses from old data)
        const underProgressCount = goal.steps.filter(
          (s) => s.status !== "pending",
        ).length;
        // Under-progress steps render above the pending backlog; all step
        // handlers index into this sorted list
        const steps = sortSteps(goal.steps);
        return (
          <section key={goal._id} className="readme-section">
            <div className="readme-heading">
              <h2 className="readme-heading__text">{goal.name}</h2>

              {goal.steps.length > 0 && (
                <span
                  className="goals-panel__progress"
                  title={`${underProgressCount} of ${goal.steps.length} habits in practice, each on the weekdays it was started with`}
                >
                  {underProgressCount}/{goal.steps.length} under progress
                </span>
              )}
              {/* Goal order is manual, like todo headers and projects — the
                  server shifts the neighbours to keep priorities contiguous. */}
              <button
                className="readme-heading__add-btn"
                onClick={() => handleMoveGoal(goal, -1)}
                disabled={idx === 0}
                aria-label={`Move goal ${goal.name} up`}
                title="Move goal up"
              >
                ↑
              </button>
              <button
                className="readme-heading__add-btn"
                onClick={() => handleMoveGoal(goal, 1)}
                disabled={idx === goals.length - 1}
                aria-label={`Move goal ${goal.name} down`}
                title="Move goal down"
              >
                ↓
              </button>
              <button
                className="readme-heading__add-btn"
                onClick={() => setDeleteTarget(goal)}
                aria-label={`Delete goal ${goal.name}`}
                title="Delete goal"
                style={{ color: "#e74c3c" }}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 1 0-1.492.141l.6 6.35A1.5 1.5 0 0 0 5.1 14.4h5.8a1.5 1.5 0 0 0 1.496-1.35l.6-6.35a.75.75 0 1 0-1.492-.141l-.6 6.33a.008.008 0 0 1-.007.011H5.104a.008.008 0 0 1-.007-.01l-.6-6.332z"
                  />
                </svg>
              </button>
              {/* Same trailing "+" the todo puts on a header, adding one step
                  at a time instead of retyping the whole list. */}
              <button
                className="readme-heading__add-btn"
                onClick={() => setAddStepGoal(goal)}
                aria-label={`Add step to ${goal.name}`}
                title="Add step"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                >
                  <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z" />
                </svg>
              </button>
            </div>

            <div className="readme-tasks">
              {steps.map((step, i) => {
                const busy = busyStep === `${goal._id}:${i}`;
                const started = step.status !== "pending";
                const days = stepDays(step);
                const streak = streaks?.[step.name.trim().toLowerCase()];
                // Moves stay inside the step's own group — mirrors the todo's
                // done/undone barrier
                const canMoveUp =
                  i > 0 && (steps[i - 1].status !== "pending") === started;
                const canMoveDown =
                  i < steps.length - 1 &&
                  (steps[i + 1].status !== "pending") === started;
                return (
                  <div
                    key={`${step.name}-${i}`}
                    className={`task-card goals-panel__step-row${started ? " goals-panel__step-row--started" : ""}`}
                  >
                    <div className="task-card__header">
                      {/* Checkbox drives the step lifecycle: checked = under
                          progress. Deliberately no --done styling — a started
                          step is active, not finished. */}
                      <button
                        className={`task-card__checkbox${started ? " task-card__checkbox--checked" : ""}`}
                        onClick={() =>
                          started
                            ? handlePauseStep(goal, i)
                            : setDaysTarget({ goal, index: i, mode: "start" })
                        }
                        disabled={busy}
                        aria-label={
                          started
                            ? `Pause step ${step.name}`
                            : `Start step ${step.name}`
                        }
                        title={
                          started
                            ? "Not in progress anymore — removes the daily task and moves the step back to the backlog"
                            : `Under progress from now on — pick its days and it becomes a task under "${ONE_STEP_HEADER}"`
                        }
                      >
                        {started && (
                          <svg
                            viewBox="0 0 16 16"
                            className="task-card__check-icon"
                          >
                            <path
                              fillRule="evenodd"
                              d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
                            />
                          </svg>
                        )}
                      </button>

                      <span className="task-card__body">
                        <span className="task-card__label">
                          <span className="task-card__name goals-panel__step-name">
                            {step.name}
                          </span>
                          {/* Same slot the todo uses for the ECD badge. A
                              started step is a recurring task there, so it
                              gets the recurring styling and the same day list
                              its task card shows. */}
                          <span
                            className={`task-card__ecd goals-panel__step-status${started ? " task-card__ecd--recurring" : ""}`}
                          >
                            [ {started ? `↻ ${daysLabel(days)}` : "Not started"}{" "}
                            ]
                          </span>
                          {/* Streak over the step's own days — a habit set to
                              Mon/Wed/Fri isn't broken by an untouched Tuesday,
                              because no result is archived for a day the task
                              wasn't due. */}
                          {started && streak && (
                            <span
                              className="goals-panel__step-streak"
                              title={`Current streak: ${streak.current} scheduled ${streak.current === 1 ? "day" : "days"} in a row (best ${streak.longest}). Counts only ${daysLabel(days)}.`}
                            >
                              🔥 {streak.current}
                            </span>
                          )}
                        </span>
                      </span>

                      {/* Same action cluster the todo puts on a task */}
                      <div className="task-card__actions">
                        {/* Only a started step has a schedule to change; a
                            pending one is asked for its days when it starts.
                            The todo can't do it — EditNotesModal locks the ECD
                            of goal-managed tasks, so this is the only way in. */}
                        {started && (
                          <button
                            className="task-card__action-btn"
                            onClick={() =>
                              setDaysTarget({ goal, index: i, mode: "edit" })
                            }
                            disabled={busy}
                            aria-label={`Change days for step ${step.name}`}
                            title="Change which days this habit runs on"
                          >
                            <svg
                              viewBox="0 0 16 16"
                              className="task-card__action-icon"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1a1.75 1.75 0 0 1 1.75 1.75v10.5A1.75 1.75 0 0 1 13 16H3a1.75 1.75 0 0 1-1.75-1.75V3.75A1.75 1.75 0 0 1 3 2h1V.75A.75.75 0 0 1 4.75 0zM3 3.5a.25.25 0 0 0-.25.25V6h10.5V3.75A.25.25 0 0 0 13 3.5H3zm10.25 4H2.75v6.75c0 .138.112.25.25.25h10a.25.25 0 0 0 .25-.25V7.5z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          className="task-card__action-btn"
                          onClick={() => handleMoveStep(goal, i, 1)}
                          disabled={busy || !canMoveDown}
                          aria-label={`Move step ${step.name} down`}
                          title="Move down"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="task-card__action-icon"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8 2.25a.75.75 0 0 1 .75.75v8.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L7.25 11.19V3A.75.75 0 0 1 8 2.25z"
                            />
                          </svg>
                        </button>
                        <button
                          className="task-card__action-btn"
                          onClick={() => handleMoveStep(goal, i, -1)}
                          disabled={busy || !canMoveUp}
                          aria-label={`Move step ${step.name} up`}
                          title="Move up"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="task-card__action-icon task-card__action-icon--flip"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8 2.25a.75.75 0 0 1 .75.75v8.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L7.25 11.19V3A.75.75 0 0 1 8 2.25z"
                            />
                          </svg>
                        </button>
                        <button
                          className="task-card__action-btn task-card__action-btn--danger"
                          onClick={() =>
                            setDeleteStepTarget({ goal, index: i })
                          }
                          disabled={busy}
                          aria-label={`Delete step ${step.name}`}
                          title="Delete step"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="task-card__action-icon"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 1 0-1.492.141l.6 6.35A1.5 1.5 0 0 0 5.1 14.4h5.8a1.5 1.5 0 0 0 1.496-1.35l.6-6.35a.75.75 0 1 0-1.492-.141l-.6 6.33a.008.008 0 0 1-.007.011H5.104a.008.008 0 0 1-.007-.01l-.6-6.332z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {goal.steps.length === 0 && (
              <p className="goals-panel__no-steps">No steps yet — add one!</p>
            )}
          </section>
        );
      })}

      {goals.length === 0 && (
        <p className="empty-message">
          No goals yet — add one! A goal (e.g. "Improve Health") lists the small
          habits that get you there, built one step at a time: start a step,
          pick the weekdays it runs on and it's under progress — for life —
          then start the next when it sticks. Its streak counts only those
          days. Pause anytime to shelve one.
        </p>
      )}

      {/* Modals */}
      {addGoalOpen && (
        <GoalModal
          onConfirm={handleSaveGoal}
          onCancel={() => setAddGoalOpen(false)}
        />
      )}

      {daysTarget && (
        <StepDaysModal
          goalName={daysTarget.goal.name}
          stepName={sortSteps(daysTarget.goal.steps)[daysTarget.index].name}
          initialDays={stepDays(
            sortSteps(daysTarget.goal.steps)[daysTarget.index],
          )}
          mode={daysTarget.mode}
          busy={
            busyStep === `${daysTarget.goal._id}:${daysTarget.index}`
          }
          onConfirm={(days) =>
            daysTarget.mode === "start"
              ? handleStartStep(daysTarget.goal, daysTarget.index, days)
              : handleChangeDays(daysTarget.goal, daysTarget.index, days)
          }
          onCancel={() => setDaysTarget(null)}
        />
      )}

      {addStepGoal && (
        <AddStepModal
          goalName={addStepGoal.name}
          busy={addingStep}
          onConfirm={handleAddStep}
          onCancel={() => setAddStepGoal(null)}
        />
      )}

      {deleteStepTarget && (
        <ConfirmModal
          message={`Delete step "${sortSteps(deleteStepTarget.goal.steps)[deleteStepTarget.index].name}" from "${deleteStepTarget.goal.name}"?${
            sortSteps(deleteStepTarget.goal.steps)[deleteStepTarget.index]
              .status !== "pending"
              ? ` Its daily task in "${ONE_STEP_HEADER}" is removed too.`
              : ""
          }`}
          onConfirm={handleDeleteStep}
          onCancel={() => setDeleteStepTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete goal "${deleteTarget.name}"? Tasks already added to the todo stay.`}
          onConfirm={handleDeleteGoal}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
