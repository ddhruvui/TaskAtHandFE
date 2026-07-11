import { useState, useEffect, useCallback } from "react";
import type { ECD, Goal, GoalStep, GoalStepStatus } from "../../types";
import * as goalsApi from "../../api/goals";
import * as headersApi from "../../api/headers";
import * as tasksApi from "../../api/tasks";
import { ONE_STEP_HEADER } from "../../utils/goalSync";
import { GoalModal } from "../GoalModal";
import { ConfirmModal } from "../ConfirmModal";
import "./GoalsPanel.css";

/** Started steps become daily habits so Insights can track them. */
const DAILY_ECD: ECD = {
  type: "day_of_week",
  value: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

interface GoalsPanelProps {
  /** Called after the todo was touched (task added/removed), so it can reload. */
  onTasksChanged: () => void;
}

export default function GoalsPanel({ onTasksChanged }: GoalsPanelProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyStep, setBusyStep] = useState<string | null>(null);

  // Modal states
  const [goalModalState, setGoalModalState] = useState<{
    mode: "add" | "edit";
    goal?: Goal;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

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

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  /* ── Goal CRUD ── */

  const handleSaveGoal = async (draft: {
    name: string;
    stepNames: string[];
  }) => {
    if (!goalModalState) return;
    try {
      if (goalModalState.mode === "add") {
        await goalsApi.create({
          name: draft.name,
          steps: draft.stepNames.map((name) => ({
            name,
            status: "pending" as const,
          })),
        });
      } else {
        // Steps that keep their name keep their status; new lines start pending
        const previous = goalModalState.goal!.steps;
        const steps: GoalStep[] = draft.stepNames.map((name) => {
          const match = previous.find(
            (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase(),
          );
          return { name, status: match?.status ?? "pending" };
        });
        await goalsApi.update(goalModalState.goal!._id, {
          name: draft.name,
          steps,
        });
      }
      await loadGoals();
      setGoalModalState(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
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
   * "One Step At A Time" header. Start creates the task (header reused when
   * one exists, created otherwise — same find-or-create pattern as event
   * scheduling) and the habit is kept for life; Pause removes the task and
   * shelves the step. Deleting the task from the todo pauses the step too
   * (see utils/goalSync). */

  const findOneStepHeader = async () => {
    const all = await headersApi.getAll();
    return all.find(
      (h) => h.name.trim().toLowerCase() === ONE_STEP_HEADER.toLowerCase(),
    );
  };

  const updateStepStatus = async (
    goal: Goal,
    stepIndex: number,
    status: GoalStepStatus,
  ) => {
    const steps = goal.steps.map((s, i) =>
      i === stepIndex ? { ...s, status } : s,
    );
    await goalsApi.update(goal._id, { steps });
  };

  const handleStartStep = async (goal: Goal, stepIndex: number) => {
    const step = goal.steps[stepIndex];
    setBusyStep(`${goal._id}:${stepIndex}`);
    try {
      const header =
        (await findOneStepHeader()) ??
        (await headersApi.create({ name: ONE_STEP_HEADER }));
      const existing = await tasksApi.getAll(header._id);
      const alreadyThere = existing.some(
        (t) => t.name.trim().toLowerCase() === step.name.trim().toLowerCase(),
      );
      if (!alreadyThere) {
        await tasksApi.create({
          name: step.name,
          headerId: header._id,
          notes: `Step towards "${goal.name}"`,
          ecd: DAILY_ECD,
        });
      }
      await updateStepStatus(goal, stepIndex, "under_progress");
      await loadGoals();
      setError(null);
      setNotice(
        `Started "${step.name}" — under progress as a daily habit in "${ONE_STEP_HEADER}".`,
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
    const step = goal.steps[stepIndex];
    setBusyStep(`${goal._id}:${stepIndex}`);
    try {
      const header = await findOneStepHeader();
      if (header) {
        const tasks = await tasksApi.getAll(header._id);
        const match = tasks.find(
          (t) => t.name.trim().toLowerCase() === step.name.trim().toLowerCase(),
        );
        if (match) await tasksApi.remove(match._id);
      }
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
        <button
          className="readme-heading__add-btn goals-panel__add-goal-btn"
          onClick={() => setGoalModalState({ mode: "add" })}
          aria-label="Add goal"
          title="Add goal"
        >
          <span style={{ marginRight: "6px" }}>+</span> Add Goal
        </button>
      </div>

      {goals.map((goal) => {
        // Anything non-pending counts (covers legacy statuses from old data)
        const underProgressCount = goal.steps.filter(
          (s) => s.status !== "pending",
        ).length;
        return (
          <section key={goal._id} className="readme-section">
            <div className="readme-heading">
              <h2 className="readme-heading__text">{goal.name}</h2>

              {goal.steps.length > 0 && (
                <span
                  className="goals-panel__progress"
                  title={`${underProgressCount} of ${goal.steps.length} habits in daily practice (building or lifelong)`}
                >
                  {underProgressCount}/{goal.steps.length} under progress
                </span>
              )}
              <button
                className="readme-heading__add-btn"
                onClick={() => setGoalModalState({ mode: "edit", goal })}
                aria-label={`Edit goal ${goal.name}`}
                title="Edit goal and its steps"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286z"
                  />
                </svg>
              </button>
              <button
                className="readme-heading__add-btn"
                onClick={() => setDeleteTarget(goal)}
                aria-label={`Delete goal ${goal.name}`}
                title="Delete goal"
                style={{ color: "#e74c3c" }}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 1 0-1.492.141l.6 6.35A1.5 1.5 0 0 0 5.1 14.4h5.8a1.5 1.5 0 0 0 1.496-1.35l.6-6.35a.75.75 0 1 0-1.492-.141l-.6 6.33a.008.008 0 0 1-.007.011H5.104a.008.008 0 0 1-.007-.01l-.6-6.332z"
                  />
                </svg>
              </button>
            </div>

            <ol className="goals-panel__step-list">
              {goal.steps.map((step, i) => {
                const busy = busyStep === `${goal._id}:${i}`;
                const started = step.status !== "pending";
                return (
                  <li
                    key={`${step.name}-${i}`}
                    className={`goals-panel__step-row${started ? " goals-panel__step-row--started" : ""}`}
                  >
                    <span
                      className="goals-panel__step-marker"
                      aria-hidden="true"
                    >
                      {started ? "∞" : i + 1}
                    </span>
                    <span className="goals-panel__step-name">{step.name}</span>
                    <div className="goals-panel__step-actions">
                      {started ? (
                        <button
                          className="goals-panel__step-btn"
                          onClick={() => handlePauseStep(goal, i)}
                          disabled={busy}
                          title="Not in progress anymore — removes the daily task and moves the step back to the backlog"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          className="goals-panel__step-btn goals-panel__step-btn--start"
                          onClick={() => handleStartStep(goal, i)}
                          disabled={busy}
                          title={`Under progress from now on — adds a daily task under "${ONE_STEP_HEADER}"`}
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {goal.steps.length === 0 && (
              <p className="goals-panel__no-steps">
                No steps yet — edit the goal to list the small habits that get
                you there.
              </p>
            )}
          </section>
        );
      })}

      {goals.length === 0 && (
        <p className="empty-message">
          No goals yet — add one! A goal (e.g. "Improve Health") lists the
          small habits that get you there, built one step at a time: start a
          step and it's under progress as a daily habit — for life — then
          start the next when it sticks. Pause anytime to shelve one.
        </p>
      )}

      {/* Modals */}
      {goalModalState && (
        <GoalModal
          goal={goalModalState.mode === "edit" ? goalModalState.goal : undefined}
          onConfirm={handleSaveGoal}
          onCancel={() => setGoalModalState(null)}
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
