import { Fragment, useState, useEffect, useCallback } from "react";
import { AddButton } from "./components/AddButton";
import { TaskCard } from "./components/TaskCard";
import { ConfirmModal } from "./components/ConfirmModal";
import { AddTaskModal } from "./components/AddTaskModal";
import { HeaderModal } from "./components/HeaderModal";
import { InsightsPanel } from "./components/InsightsPanel";
import { EventsPanel } from "./components/EventsPanel";
import { LifeEventsPanel } from "./components/LifeEventsPanel";
import { GoalsPanel } from "./components/GoalsPanel";
import { ProjectsPanel } from "./components/ProjectsPanel";
import { AffirmationsPanel } from "./components/AffirmationsPanel";
import { CallsPanel } from "./components/CallsPanel";
import { VacationPanel } from "./components/VacationPanel";
import { OnCallPanel } from "./components/OnCallPanel";
import { Icon } from "./components/Icon";
import type { IconName } from "./components/Icon";
import type { Header, OnCallShift, Task, VacationStatus } from "./types";
import type { EditPayload } from "./components/TaskCard/TaskCard.types";
import * as headersApi from "./api/headers";
import * as tasksApi from "./api/tasks";
import * as vacationsApi from "./api/vacations";
import * as onCallApi from "./api/oncall";
import { activeShift, formatDuration, minutesLeft } from "./utils/oncall";
import { getEcdDateKey, formatDateKey, todayDateKey } from "./utils/ecd";
import {
  fetchOneStepStreaks,
  isOneStepHeaderName,
  pauseStepsMatchingTask,
  pauseAllStartedSteps,
  streakFor,
} from "./utils/goalSync";
import type { StreakMap } from "./utils/goalSync";
import {
  syncProjectTasksForTodoDone,
  syncProjectTasksForTodoEdit,
  syncProjectTaskOrderForTodo,
  unlinkProjectTasksForTodoTasks,
} from "./utils/projectSync";
import {
  syncLifeEventsForTodoDone,
  syncLifeEventsForTodoEdit,
  unlinkLifeEventsForTodoTasks,
} from "./utils/lifeEventSync";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

interface HeaderWithTasks extends Header {
  tasks: Task[];
}

/* ── Views ──
   The todo list (with its By Date filter) is home; every other view is a
   panel. Panels are mutually exclusive and toggle: clicking the active
   panel's nav item returns to the todo. Each nav item keeps its
   `<key>-toggle-btn` class, aria-pressed state and Show/Hide aria-label —
   e2e drives the views through exactly those. */
type PanelKey =
  | "insights"
  | "events"
  | "lifeevents"
  | "goals"
  | "projects"
  | "affirmations"
  | "calls"
  | "vacation"
  | "oncall";

interface PanelNavItem {
  key: PanelKey;
  label: string;
  /** Noun in the "Show …"/"Hide …" aria-label */
  noun: string;
  icon: IconName;
  description: string;
}

const NAV_GROUPS: { label: string | null; items: PanelNavItem[] }[] = [
  {
    label: null,
    items: [
      {
        key: "insights",
        label: "Insights",
        noun: "insights",
        icon: "insights",
        description: "Habit stats, task history and your AI coach.",
      },
    ],
  },
  {
    label: "Plan",
    items: [
      {
        key: "projects",
        label: "Projects",
        noun: "projects",
        icon: "projects",
        description: "Long-term efforts, built one dated step at a time.",
      },
      {
        key: "goals",
        label: "Goals",
        noun: "goals",
        icon: "goals",
        description: "Habits you build one step at a time.",
      },
      {
        key: "events",
        label: "Events",
        noun: "events",
        icon: "events",
        description: "Bundles of tasks you can drop into your todo in one go.",
      },
    ],
  },
  {
    label: "Life",
    items: [
      {
        key: "lifeevents",
        label: "Life events",
        noun: "life events",
        icon: "lifeevents",
        description:
          "Birthdays and anniversaries, added to your todo each year.",
      },
      {
        key: "calls",
        label: "Calls",
        noun: "calls",
        icon: "calls",
        description: "People to catch up with, biweekly or monthly.",
      },
      {
        key: "affirmations",
        label: "Affirmations",
        noun: "affirmations",
        icon: "affirmations",
        description: "Short lines to read every day.",
      },
    ],
  },
  {
    label: "Time off",
    items: [
      {
        key: "vacation",
        label: "Vacation",
        noun: "vacations",
        icon: "vacation",
        description:
          "Days off — missed habits during these don't count against you.",
      },
      {
        key: "oncall",
        label: "On-call",
        noun: "on-call",
        icon: "oncall",
        description: "Your on-call shifts, kept separate from tasks.",
      },
    ],
  },
];

const PANELS = NAV_GROUPS.flatMap((g) => g.items);

function todayHeading(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function App() {
  const [headers, setHeaders] = useState<HeaderWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [byDateMode, setByDateMode] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const { theme, cycleTheme } = useTheme();

  // On-call shifts are app-level so the "on call now" banner shows from every
  // view. On-call is a record only — it never feeds into tasks or stats.
  const [onCallShifts, setOnCallShifts] = useState<OnCallShift[]>([]);
  const [clock, setClock] = useState(() => new Date());

  // Vacation status is app-level, not panel-level, on purpose: the most likely
  // real-world failure of this feature is booking time off and forgetting, then
  // wondering months later why the insights went quiet. The banner below makes
  // an active vacation visible from every view.
  const [vacationStatus, setVacationStatus] = useState<VacationStatus | null>(
    null,
  );

  // Habit streaks for the tasks under "One Step At A Time", keyed by name —
  // the same badge the Goals view puts on the step each of them belongs to.
  // Null while it is loading and after a failed fetch, which just hides them.
  const [streaks, setStreaks] = useState<StreakMap | null>(null);

  // Panel views are mutually exclusive — opening one closes the rest, and
  // clicking the open one again goes back to the todo (byDateMode is a
  // todo-list filter, not a panel, and stays independent).
  const togglePanel = (key: PanelKey) =>
    setActivePanel((prev) => (prev === key ? null : key));

  /** Home: the todo list, keeping whichever list/by-date layout was chosen. */
  const showTasks = (byDate: boolean) => {
    setActivePanel(null);
    setByDateMode(byDate);
  };

  // Modal states
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "header" | "task";
    headerId: string;
    id: string;
    name: string;
    done?: boolean; // task only — undone tasks require a deletion reason
  } | null>(null);
  const [addTaskHeaderId, setAddTaskHeaderId] = useState<string | null>(null);
  const [headerModalState, setHeaderModalState] = useState<{
    mode: "add" | "edit";
    headerId?: string;
    name?: string;
  } | null>(null);

  /**
   * Vacation status, refreshed on load and after the Vacation panel changes
   * anything. A failure is swallowed: the banner is context, never a reason to
   * show the user an error over their todo list.
   */
  const refreshVacationStatus = useCallback(async () => {
    try {
      setVacationStatus(await vacationsApi.getStatus());
    } catch {
      setVacationStatus(null);
    }
  }, []);

  /**
   * Habit streaks, refreshed alongside the todo. Only the nightly archive
   * moves these numbers, so ticking a habit off today does not change the
   * badge until the cron has scored the day.
   */
  const refreshStreaks = useCallback(async () => {
    setStreaks(await fetchOneStepStreaks());
  }, []);

  /* ── Load all headers and their tasks ── */
  const loadAll = useCallback(async () => {
    try {
      const allHeaders = await headersApi.getAll();
      const headersWithTasks = await Promise.all(
        allHeaders.map(async (header) => {
          const tasks = await tasksApi.getAll(header._id);
          return { ...header, tasks };
        }),
      );
      setHeaders(headersWithTasks);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, []);

  /** On-call shifts for the banner. A failure just hides the banner. */
  const refreshOnCall = useCallback(async () => {
    try {
      setOnCallShifts(await onCallApi.getAll());
    } catch {
      setOnCallShifts([]);
    }
  }, []);

  useEffect(() => {
    // Initial load. Kicked off from a resolved promise so every setState
    // lands in an async callback, not the effect body
    // (react-hooks/set-state-in-effect).
    void Promise.resolve().then(() => {
      loadAll();
      refreshVacationStatus();
      refreshStreaks();
      refreshOnCall();
    });
  }, [loadAll, refreshVacationStatus, refreshStreaks, refreshOnCall]);

  // The banner's "time left" and its disappearance at shift end follow the
  // local clock, so tick once a minute.
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Each view starts at the top, like a page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activePanel, byDateMode]);

  const currentShift = activeShift(onCallShifts, clock);

  /* ── Reload tasks for a single header ── */
  const reloadHeaderTasks = useCallback(async (headerId: string) => {
    try {
      const tasks = await tasksApi.getAll(headerId);
      setHeaders((prev) =>
        prev.map((h) => (h._id === headerId ? { ...h, tasks } : h)),
      );
    } catch (err) {
      console.error("Failed to reload tasks:", err);
    }
  }, []);

  /* ── Header CRUD ── */

  const handleAddHeader = async (name: string) => {
    try {
      const newHeader = await headersApi.create({ name });
      setHeaders((prev) => [...prev, { ...newHeader, tasks: [] }]);
      setHeaderModalState(null);
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleEditHeader = async (name: string) => {
    if (!headerModalState || headerModalState.mode !== "edit") return;
    try {
      const updated = await headersApi.update(headerModalState.headerId!, {
        name,
      });
      setHeaders((prev) =>
        prev.map((h) =>
          h._id === headerModalState.headerId
            ? { ...h, name: updated.name }
            : h,
        ),
      );
      setHeaderModalState(null);
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleDeleteHeader = async () => {
    if (!deleteTarget || deleteTarget.type !== "header") return;
    try {
      const header = headers.find((h) => h._id === deleteTarget.id);
      const cascadedTaskIds = header?.tasks.map((t) => t._id) ?? [];
      await headersApi.remove(deleteTarget.id);
      setHeaders((prev) => prev.filter((h) => h._id !== deleteTarget.id));
      // Deleting "One Step At A Time" takes every daily habit task with it,
      // so the started goal steps move back to paused/pending too
      if (isOneStepHeaderName(deleteTarget.name)) {
        await pauseAllStartedSteps();
      }
      // Cascade-deleted tasks may back dated project tasks — unlink them
      await unlinkProjectTasksForTodoTasks(cascadedTaskIds);
      // …and may back life events — unlink those too (done state untouched)
      await unlinkLifeEventsForTodoTasks(cascadedTaskIds);
      setDeleteTarget(null);
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleMoveHeaderUp = async (headerId: string) => {
    const idx = headers.findIndex((h) => h._id === headerId);
    if (idx <= 0) return;
    const newPriority = headers[idx].priority - 1;
    try {
      await headersApi.update(headerId, { priority: newPriority });
      await loadAll(); // Reload to get updated priorities
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleMoveHeaderDown = async (headerId: string) => {
    const idx = headers.findIndex((h) => h._id === headerId);
    if (idx < 0 || idx >= headers.length - 1) return;
    const newPriority = headers[idx].priority + 1;
    try {
      await headersApi.update(headerId, { priority: newPriority });
      await loadAll(); // Reload to get updated priorities
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  /* ── Task CRUD ── */

  const handleAddTask = async (draft: {
    name: string;
    notes: string;
    ecd: tasksApi.ECD | null;
  }) => {
    if (!addTaskHeaderId) return;
    try {
      await tasksApi.create({
        name: draft.name,
        headerId: addTaskHeaderId,
        notes: draft.notes,
        ecd: draft.ecd,
      });
      await reloadHeaderTasks(addTaskHeaderId);
      setAddTaskHeaderId(null);
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleToggleDone = (headerId: string) => async (taskId: string) => {
    const header = headers.find((h) => h._id === headerId);
    const task = header?.tasks.find((t) => t._id === taskId);
    if (!task) return;
    try {
      await tasksApi.update(taskId, { done: !task.done });
      await reloadHeaderTasks(headerId);
      // A task linked from a long-term project mirrors its done state there
      await syncProjectTasksForTodoDone(taskId, !task.done);
      // A task added from a life event mirrors its done state there too
      await syncLifeEventsForTodoDone(taskId, !task.done);
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleEditTask =
    (headerId: string) => async (taskId: string, payload: EditPayload) => {
      try {
        await tasksApi.update(taskId, {
          name: payload.name,
          notes: payload.notes,
          ecd: payload.ecd,
          ...(payload.reason ? { reason: payload.reason } : {}),
        });
        await reloadHeaderTasks(headerId);
        // A task linked from a long-term project mirrors its name, date and
        // notes there (a cleared/recurring ECD clears the project date)
        await syncProjectTasksForTodoEdit(
          taskId,
          payload.name,
          payload.ecd,
          payload.notes,
        );
        // A task added from a life event mirrors its name there (the annual
        // date is not synced — rescheduling this year's task doesn't move it)
        await syncLifeEventsForTodoEdit(taskId, payload.name);
        setActionError(null);
      } catch (err) {
        setActionError((err as Error).message);
      }
    };

  const handleMoveTaskUp = (headerId: string) => async (taskId: string) => {
    const header = headers.find((h) => h._id === headerId);
    const task = header?.tasks.find((t) => t._id === taskId);
    if (!task) return;
    const newPriority = task.priority - 1;
    try {
      await tasksApi.update(taskId, { priority: newPriority });
      const fresh = await tasksApi.getAll(headerId);
      setHeaders((prev) =>
        prev.map((h) => (h._id === headerId ? { ...h, tasks: fresh } : h)),
      );
      // Tasks linked from a long-term project keep the project's order in step
      await syncProjectTaskOrderForTodo(fresh.map((t) => t._id));
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
      await reloadHeaderTasks(headerId);
    }
  };

  const handleMoveTaskDown = (headerId: string) => async (taskId: string) => {
    const header = headers.find((h) => h._id === headerId);
    const task = header?.tasks.find((t) => t._id === taskId);
    if (!task) return;
    const newPriority = task.priority + 1;
    try {
      await tasksApi.update(taskId, { priority: newPriority });
      const fresh = await tasksApi.getAll(headerId);
      setHeaders((prev) =>
        prev.map((h) => (h._id === headerId ? { ...h, tasks: fresh } : h)),
      );
      // Tasks linked from a long-term project keep the project's order in step
      await syncProjectTaskOrderForTodo(fresh.map((t) => t._id));
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
      await reloadHeaderTasks(headerId);
    }
  };

  const handleDeleteTask = (headerId: string) => (taskId: string) => {
    const header = headers.find((h) => h._id === headerId);
    const task = header?.tasks.find((t) => t._id === taskId);
    if (!task) return;
    setDeleteTarget({
      type: "task",
      headerId,
      id: taskId,
      name: task.name,
      done: task.done,
    });
  };

  const confirmDeleteTask = async (reason?: string) => {
    if (!deleteTarget || deleteTarget.type !== "task") return;
    try {
      const header = headers.find((h) => h._id === deleteTarget.headerId);
      await tasksApi.remove(deleteTarget.id, reason);
      await reloadHeaderTasks(deleteTarget.headerId);
      // A daily habit task deleted from "One Step At A Time" pauses its step
      if (header && isOneStepHeaderName(header.name)) {
        await pauseStepsMatchingTask(deleteTarget.name);
      }
      // A task backing a dated project task unlinks it there
      await unlinkProjectTasksForTodoTasks([deleteTarget.id]);
      // A task added from a life event unlinks it there (done untouched)
      await unlinkLifeEventsForTodoTasks([deleteTarget.id]);
      setDeleteTarget(null);
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  /* ── Derived view data ── */

  const addTaskHeader = headers.find((h) => h._id === addTaskHeaderId);
  const headerNameById = new Map(headers.map((h) => [h._id, h.name]));

  // Daily habit tasks under "One Step At A Time" are linked to their goal
  // step by name — TaskCard locks name/schedule edits for them.
  const oneStepHeaderIds = new Set(
    headers.filter((h) => isOneStepHeaderName(h.name)).map((h) => h._id),
  );

  // Sidebar counts: open tasks, and how many of them are due today or late.
  const today = todayDateKey();
  let openCount = 0;
  let dueCount = 0;
  headers.forEach((h) =>
    h.tasks.forEach((t) => {
      if (t.done) return;
      openCount += 1;
      const key = getEcdDateKey(t.ecd);
      if (key && key <= today) dueCount += 1;
    }),
  );

  /* ── By Date view: group tasks by calendar date into present, past and
     future sections (today first, then old dates, then future ones) ── */
  const byDateSections = (() => {
    if (!byDateMode) return [];
    const groups = new Map<string, { task: Task; headerPriority: number }[]>();
    const noDate: { task: Task; headerPriority: number }[] = [];
    headers.forEach((header) => {
      header.tasks.forEach((task) => {
        if (task.done) return; // drop done tasks before grouping by date
        const key = getEcdDateKey(task.ecd);
        if (!key) {
          if (!task.ecd) noDate.push({ task, headerPriority: header.priority });
          return; // recurring patterns have no single date; skip
        }
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ task, headerPriority: header.priority });
      });
    });
    const sortTasks = (items: { task: Task; headerPriority: number }[]) =>
      items
        .sort(
          (x, y) =>
            x.headerPriority - y.headerPriority ||
            x.task.priority - y.task.priority,
        )
        .map((item) => item.task);
    const dated = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b)) // ascending date
      .map(([key, items]) => ({
        key,
        label: formatDateKey(key),
        tasks: sortTasks(items),
      }));
    const present = dated.filter((g) => g.key === today);
    const past = dated.filter((g) => g.key < today);
    const future = dated.filter((g) => g.key > today);
    if (noDate.length > 0) {
      // undated tasks always come last
      future.push({
        key: "__no_date__",
        label: "No date",
        tasks: sortTasks(noDate),
      });
    }
    return [
      { key: "present", label: "Today", groups: present },
      { key: "past", label: "Overdue", groups: past },
      { key: "future", label: "Upcoming", groups: future },
    ].filter((section) => section.groups.length > 0);
  })();

  const currentPanel = PANELS.find((p) => p.key === activePanel) ?? null;
  const onTasksView = activePanel === null;

  const themeLabel =
    theme === "system" ? "System" : theme === "light" ? "Light" : "Dark";

  /* ── Render ── */

  const renderTaskList = () => (
    <>
      {headers.map((header, idx) => {
        const visibleTasks = header.tasks;
        const openInHeader = visibleTasks.filter((t) => !t.done).length;

        return (
          <section key={header._id} className="readme-section">
            {/* ── Header heading ── */}
            <div className="readme-heading">
              <div className="readme-heading__title">
                <h2 className="readme-heading__text">{header.name}</h2>
                <span
                  className="readme-heading__count"
                  title={`${openInHeader} open`}
                >
                  {openInHeader}
                </span>
              </div>

              <div className="readme-heading__actions readme-heading__actions--reveal">
                <button
                  className="readme-heading__add-btn"
                  onClick={() => handleMoveHeaderUp(header._id)}
                  disabled={idx === 0}
                  aria-label="Move header up"
                  title="Move header up"
                >
                  <Icon name="arrow-up" size={15} />
                </button>
                <button
                  className="readme-heading__add-btn"
                  onClick={() => handleMoveHeaderDown(header._id)}
                  disabled={idx === headers.length - 1}
                  aria-label="Move header down"
                  title="Move header down"
                >
                  <Icon name="arrow-down" size={15} />
                </button>
                <button
                  className="readme-heading__add-btn"
                  onClick={() =>
                    setHeaderModalState({
                      mode: "edit",
                      headerId: header._id,
                      name: header.name,
                    })
                  }
                  aria-label="Edit header"
                  title="Edit header"
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button
                  className="readme-heading__add-btn icon-btn--danger"
                  onClick={() =>
                    setDeleteTarget({
                      type: "header",
                      headerId: header._id,
                      id: header._id,
                      name: header.name,
                    })
                  }
                  aria-label="Delete header"
                  title="Delete header"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
              {/* Add task stays visible: it's the section's main action */}
              <button
                className="readme-heading__add-btn app-add-task-btn"
                onClick={() => setAddTaskHeaderId(header._id)}
                aria-label={`Add task to ${header.name}`}
                title="Add task"
              >
                <Icon name="plus" size={16} />
              </button>
            </div>

            {/* ── Task list ── */}
            <div className="readme-tasks">
              {visibleTasks.map((task, taskIdx) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  isFirst={taskIdx === 0}
                  isLast={taskIdx === visibleTasks.length - 1}
                  prevTaskDone={
                    taskIdx > 0 ? visibleTasks[taskIdx - 1].done : undefined
                  }
                  nextTaskDone={
                    taskIdx < visibleTasks.length - 1
                      ? visibleTasks[taskIdx + 1].done
                      : undefined
                  }
                  goalManaged={oneStepHeaderIds.has(header._id)}
                  streak={
                    oneStepHeaderIds.has(header._id)
                      ? streakFor(streaks, task.name)
                      : undefined
                  }
                  onToggleDone={handleToggleDone(header._id)}
                  onEdit={handleEditTask(header._id)}
                  onMoveUp={handleMoveTaskUp(header._id)}
                  onMoveDown={handleMoveTaskDown(header._id)}
                  onDelete={handleDeleteTask(header._id)}
                />
              ))}
              {visibleTasks.length === 0 && (
                <button
                  className="app-empty-row"
                  onClick={() => setAddTaskHeaderId(header._id)}
                >
                  <Icon name="plus" size={14} />
                  <span className="empty-message">No tasks yet — add one!</span>
                </button>
              )}
            </div>
          </section>
        );
      })}

      {headers.length === 0 && (
        <div className="app-empty-state">
          <span className="app-empty-state__icon" aria-hidden="true">
            <Icon name="tasks" size={22} />
          </span>
          <p className="empty-message">No headers yet — add one!</p>
          <p className="app-empty-state__hint">
            Headers group your tasks — try “Work”, “Home” or “Health”.
          </p>
        </div>
      )}
    </>
  );

  const renderByDate = () => (
    <>
      {byDateSections.map((section, sectionIdx) => (
        <Fragment key={section.key}>
          {sectionIdx > 0 && <hr className="bydate-divider" />}
          <p
            className={`bydate-section-label bydate-section-label--${section.key}`}
          >
            {section.label}
          </p>
          {section.groups.map((group) => (
            <section key={group.key} className="readme-section">
              <div className="readme-heading">
                <div className="readme-heading__title">
                  <h2 className="readme-heading__text">{group.label}</h2>
                  <span className="readme-heading__count">
                    {group.tasks.length}
                  </span>
                </div>
              </div>
              <div className="readme-tasks">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    isFirst
                    isLast
                    headerName={headerNameById.get(task.headerId)}
                    goalManaged={oneStepHeaderIds.has(task.headerId)}
                    streak={
                      oneStepHeaderIds.has(task.headerId)
                        ? streakFor(streaks, task.name)
                        : undefined
                    }
                    onToggleDone={handleToggleDone(task.headerId)}
                    onEdit={handleEditTask(task.headerId)}
                    onMoveUp={handleMoveTaskUp(task.headerId)}
                    onMoveDown={handleMoveTaskDown(task.headerId)}
                    onDelete={handleDeleteTask(task.headerId)}
                  />
                ))}
              </div>
            </section>
          ))}
        </Fragment>
      ))}
      {byDateSections.length === 0 && (
        <div className="app-empty-state">
          <span className="app-empty-state__icon" aria-hidden="true">
            <Icon name="calendar" size={22} />
          </span>
          <p className="empty-message">No dated tasks to show.</p>
        </div>
      )}
    </>
  );

  const renderTasksView = () => {
    if (loading) {
      return (
        <div className="app-skeleton" aria-busy="true">
          <p className="empty-message">Loading…</p>
          {[0, 1].map((i) => (
            <div key={i} className="app-skeleton__card">
              <div className="app-skeleton__line app-skeleton__line--title" />
              <div className="app-skeleton__line" />
              <div className="app-skeleton__line app-skeleton__line--short" />
            </div>
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="alert alert--danger" role="alert">
          <Icon name="alert" />
          <p className="empty-message app-load-error">
            Failed to load: {error}. Is the backend running at{" "}
            {import.meta.env.VITE_API_BASE_URL}?
          </p>
        </div>
      );
    }
    return byDateMode ? renderByDate() : renderTaskList();
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar: brand + grouped navigation (a top bar on phones) ── */}
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="app-brand__mark" aria-hidden="true">
            <Icon name="check" size={14} strokeWidth={3} />
          </span>
          <h1 className="app-brand__title">Task At Hand</h1>
          <button
            className="icon-btn app-theme-btn"
            onClick={cycleTheme}
            aria-label={`Colour theme: ${themeLabel}`}
            title={`Theme: ${themeLabel} (click to switch)`}
          >
            <Icon
              name={
                theme === "system"
                  ? "monitor"
                  : theme === "light"
                    ? "sun"
                    : "moon"
              }
            />
          </button>
        </div>

        <nav className="app-nav" aria-label="Views">
          <div className="app-nav__group">
            <button
              className={`app-nav__item tasks-nav-btn${onTasksView && !byDateMode ? " app-nav__item--current" : ""}`}
              onClick={() => showTasks(false)}
              aria-current={onTasksView && !byDateMode ? "page" : undefined}
              title="Your todo list, grouped by header"
            >
              <span
                className="app-nav__icon"
                style={{ background: "var(--hue-tasks)" }}
              >
                <Icon name="tasks" size={14} />
              </span>
              <span className="app-nav__label">Tasks</span>
              {!loading && openCount > 0 && (
                <span className="app-nav__count">{openCount}</span>
              )}
            </button>
            {/* By Date is a todo-list filter, not a panel: its pressed state
                survives visiting a panel, and from a panel it opens the todo
                grouped by date. */}
            <button
              className={`app-nav__item bydate-toggle-btn${byDateMode ? " bydate-toggle-btn--active" : ""}${onTasksView && byDateMode ? " app-nav__item--current" : ""}`}
              onClick={() =>
                onTasksView ? setByDateMode((prev) => !prev) : showTasks(true)
              }
              aria-label={
                byDateMode ? "Disable by date view" : "Enable by date view"
              }
              aria-pressed={byDateMode}
              title={
                byDateMode
                  ? "By date view on — tasks grouped by date"
                  : "Group tasks by date"
              }
            >
              <span
                className="app-nav__icon"
                style={{ background: "var(--hue-bydate)" }}
              >
                <Icon name="calendar" size={14} />
              </span>
              <span className="app-nav__label">By date</span>
              {!loading && dueCount > 0 && (
                <span className="app-nav__count app-nav__count--due">
                  {dueCount}
                </span>
              )}
            </button>
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.label ?? "top"} className="app-nav__group">
              {group.label && (
                <p className="app-nav__group-label">{group.label}</p>
              )}
              {group.items.map((item) => {
                const active = activePanel === item.key;
                return (
                  <button
                    key={item.key}
                    className={`app-nav__item ${item.key}-toggle-btn${active ? ` ${item.key}-toggle-btn--active app-nav__item--current` : ""}`}
                    onClick={() => togglePanel(item.key)}
                    aria-label={`${active ? "Hide" : "Show"} ${item.noun}`}
                    aria-pressed={active}
                    title={item.description}
                  >
                    <span
                      className="app-nav__icon"
                      style={{ background: `var(--hue-${item.key})` }}
                    >
                      <Icon name={item.icon} size={14} />
                    </span>
                    <span className="app-nav__label">{item.label}</span>
                    {item.key === "oncall" && currentShift && (
                      <span
                        className="app-nav__live"
                        title="On call now"
                        aria-hidden="true"
                      />
                    )}
                    {item.key === "vacation" &&
                      vacationStatus?.onVacation &&
                      vacationStatus.active && (
                        <span
                          className="app-nav__live app-nav__live--vacation"
                          title="On vacation"
                          aria-hidden="true"
                        />
                      )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main column ── */}
      <main className="app-main">
        <div className="app-main__inner">
          {actionError && (
            <div className="alert alert--danger app-action-error" role="alert">
              <Icon name="alert" />
              <p className="app-action-error__text">
                Action failed: {actionError}
              </p>
              <button
                className="icon-btn app-action-error__dismiss"
                onClick={() => setActionError(null)}
                aria-label="Dismiss error"
                title="Dismiss"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )}

          {/* Shown in every view *except* the Vacation panel, which carries its
              own fuller banner: booking time off and forgetting is the failure
              mode this feature actually has, but two banners stacked on the same
              screen is just noise. */}
          {vacationStatus?.onVacation &&
            vacationStatus.active &&
            activePanel !== "vacation" && (
              <div className="app-banner app-vacation-banner" role="status">
                <span className="app-banner__icon" aria-hidden="true">
                  <Icon name="vacation" size={14} />
                </span>
                <span className="app-banner__text app-vacation-banner__text">
                  <strong>On vacation</strong> — day{" "}
                  {vacationStatus.active.dayOfVacation} of{" "}
                  {vacationStatus.active.totalDays}
                  {vacationStatus.active.note
                    ? ` · ${vacationStatus.active.note}`
                    : ""}
                  . Missed days aren't counted against you.
                </span>
                <button
                  className="btn btn--ghost btn--sm app-banner__btn app-vacation-banner__btn"
                  onClick={() => setActivePanel("vacation")}
                  aria-label="Manage vacation"
                >
                  Manage
                </button>
              </div>
            )}
          {/* On call right now — shown in every view, including On-call. */}
          {currentShift && (
            <div
              className={`app-banner app-oncall-banner app-oncall-banner--${currentShift.type}`}
              role="status"
            >
              <span className="app-banner__pulse" aria-hidden="true" />
              <span className="app-banner__text app-oncall-banner__text">
                <strong>
                  {currentShift.type === "primary" ? "Primary" : "Secondary"} on
                  call now
                </strong>{" "}
                · until{" "}
                {currentShift.end === "24:00" ? "midnight" : currentShift.end} ·{" "}
                {formatDuration(minutesLeft(currentShift, clock))} left
              </span>
              {activePanel !== "oncall" && (
                <button
                  className="btn btn--ghost btn--sm app-banner__btn app-oncall-banner__btn"
                  onClick={() => setActivePanel("oncall")}
                  aria-label="Manage on-call"
                >
                  Manage
                </button>
              )}
            </div>
          )}

          {onTasksView ? (
            <div className="app-view">
              <header className="page-header">
                <div className="page-header__text">
                  <h2 className="page-header__title">
                    {byDateMode ? "By date" : "Tasks"}
                  </h2>
                  <p className="page-header__description">
                    {todayHeading()}
                    {!loading && !error && (
                      <>
                        {" · "}
                        {openCount} open
                        {dueCount > 0 && ` · ${dueCount} due`}
                      </>
                    )}
                  </p>
                </div>
                {/* Add Header: the todo view's toolbar */}
                {!byDateMode && (
                  <div className="page-header__actions app__toolbar">
                    <AddButton
                      ariaLabel="Add header"
                      onClick={() => setHeaderModalState({ mode: "add" })}
                    />
                  </div>
                )}
              </header>
              {renderTasksView()}
            </div>
          ) : (
            currentPanel && (
              <div
                className={`app-view app-view--panel app-view--${currentPanel.key}`}
              >
                <header className="page-header">
                  <div className="page-header__text">
                    <h2 className="page-header__title">{currentPanel.label}</h2>
                    <p className="page-header__description">
                      {currentPanel.description}
                    </p>
                  </div>
                </header>

                {activePanel === "insights" && <InsightsPanel />}
                {activePanel === "events" && (
                  <EventsPanel
                    onTasksAdded={loadAll}
                    onViewTodo={() => setActivePanel(null)}
                  />
                )}
                {activePanel === "lifeevents" && (
                  <LifeEventsPanel onTasksChanged={loadAll} />
                )}
                {activePanel === "goals" && (
                  <GoalsPanel onTasksChanged={loadAll} />
                )}
                {activePanel === "projects" && (
                  <ProjectsPanel onTasksChanged={loadAll} />
                )}
                {activePanel === "affirmations" && <AffirmationsPanel />}
                {activePanel === "calls" && <CallsPanel />}
                {activePanel === "vacation" && (
                  <VacationPanel
                    onTasksChanged={async () => {
                      await loadAll();
                      await refreshVacationStatus();
                    }}
                  />
                )}
                {activePanel === "oncall" && (
                  <OnCallPanel onShiftsChanged={refreshOnCall} />
                )}
              </div>
            )
          )}
        </div>
      </main>

      {/* Modals */}
      {deleteTarget && (
        <ConfirmModal
          message={
            deleteTarget.type === "header"
              ? `Delete header "${deleteTarget.name}" and all its tasks?`
              : `Delete task "${deleteTarget.name}"?`
          }
          requireReason={
            deleteTarget.type === "task" && deleteTarget.done === false
          }
          onConfirm={
            deleteTarget.type === "header"
              ? handleDeleteHeader
              : confirmDeleteTask
          }
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {addTaskHeader && (
        <AddTaskModal
          headerName={addTaskHeader.name}
          onConfirm={handleAddTask}
          onCancel={() => setAddTaskHeaderId(null)}
        />
      )}

      {headerModalState && (
        <HeaderModal
          headerName={
            headerModalState.mode === "edit" ? headerModalState.name : undefined
          }
          onConfirm={
            headerModalState.mode === "add" ? handleAddHeader : handleEditHeader
          }
          onCancel={() => setHeaderModalState(null)}
        />
      )}
    </div>
  );
}

export default App;
