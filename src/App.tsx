import { useState, useEffect, useCallback } from "react";
import { TaskCard } from "./components/TaskCard";
import { ConfirmModal } from "./components/ConfirmModal";
import { AddTaskModal } from "./components/AddTaskModal";
import { HeaderModal } from "./components/HeaderModal";
import type { Header, Task } from "./types";
import type { EditPayload } from "./components/TaskCard/TaskCard.types";
import * as headersApi from "./api/headers";
import * as tasksApi from "./api/tasks";
import {
  isTaskDueToday,
  isTaskPast,
  getEcdDateKey,
  formatDateKey,
} from "./utils/ecd";
import "./App.css";

interface HeaderWithTasks extends Header {
  tasks: Task[];
}

function App() {
  const [headers, setHeaders] = useState<HeaderWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [pastMode, setPastMode] = useState(false);
  const [byDateMode, setByDateMode] = useState(false);

  // Modal states
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "header" | "task";
    headerId: string;
    id: string;
    name: string;
  } | null>(null);
  const [addTaskHeaderId, setAddTaskHeaderId] = useState<string | null>(null);
  const [headerModalState, setHeaderModalState] = useState<{
    mode: "add" | "edit";
    headerId?: string;
    name?: string;
  } | null>(null);

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

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
      await headersApi.remove(deleteTarget.id);
      setHeaders((prev) => prev.filter((h) => h._id !== deleteTarget.id));
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
        });
        await reloadHeaderTasks(headerId);
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
      await reloadHeaderTasks(headerId);
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
      await reloadHeaderTasks(headerId);
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
    });
  };

  const confirmDeleteTask = async () => {
    if (!deleteTarget || deleteTarget.type !== "task") return;
    try {
      await tasksApi.remove(deleteTarget.id);
      await reloadHeaderTasks(deleteTarget.headerId);
      setDeleteTarget(null);
      setActionError(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="app-container">
        <h1>Task At Hand</h1>
        <div className="readme">
          <p className="empty-message">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <h1>Task At Hand</h1>
        <div className="readme">
          <p className="empty-message">
            Failed to load: {error}. Is the backend running at{" "}
            {import.meta.env.VITE_API_BASE_URL}?
          </p>
        </div>
      </div>
    );
  }

  const addTaskHeader = headers.find((h) => h._id === addTaskHeaderId);

  /* ── Shared Focus/Past filter (applies in both views) ── */
  const matchesFilter = (task: Task) => {
    if (focusMode && pastMode)
      return isTaskDueToday(task.ecd) || isTaskPast(task.ecd);
    if (focusMode) return isTaskDueToday(task.ecd);
    if (pastMode) return isTaskPast(task.ecd);
    return true;
  };

  /* ── By Date view: group filtered tasks by their calendar date ── */
  const byDateGroups = (() => {
    if (!byDateMode) return [];
    const groups = new Map<string, { task: Task; headerPriority: number }[]>();
    const noDate: { task: Task; headerPriority: number }[] = [];
    headers.forEach((header) => {
      header.tasks.forEach((task) => {
        if (task.done) return; // drop done tasks before grouping by date
        if (!matchesFilter(task)) return;
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
    if (noDate.length > 0) {
      // undated tasks always come last
      dated.push({
        key: "__no_date__",
        label: "No date",
        tasks: sortTasks(noDate),
      });
    }
    return dated;
  })();

  return (
    <div className="app-container">
      <h1>Task At Hand</h1>

      <div className="readme">
        {actionError && (
          <p className="empty-message">Action failed: {actionError}</p>
        )}
        {/* Add Header button at the top */}
        <div
          style={{
            marginBottom: "24px",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            className={`readme-heading__add-btn focus-toggle-btn${focusMode ? " focus-toggle-btn--active" : ""}`}
            onClick={() => setFocusMode((prev) => !prev)}
            aria-label={focusMode ? "Disable focus mode" : "Enable focus mode"}
            aria-pressed={focusMode}
            title={
              focusMode
                ? pastMode
                  ? "Focus mode on — showing today's and past tasks"
                  : "Focus mode on — showing today's tasks only"
                : "Enable focus mode"
            }
            style={{
              width: "auto",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 4a4 4 0 1 1 0 8A4 4 0 0 1 8 4zm0 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 7a1 1 0 1 1 0 2A1 1 0 0 1 8 7z" />
            </svg>
            Focus
          </button>
          <button
            className={`readme-heading__add-btn past-toggle-btn${pastMode ? " past-toggle-btn--active" : ""}`}
            onClick={() => setPastMode((prev) => !prev)}
            aria-label={pastMode ? "Disable past mode" : "Enable past mode"}
            aria-pressed={pastMode}
            title={
              pastMode
                ? focusMode
                  ? "Past mode on — showing today's and past tasks"
                  : "Past mode on — showing overdue tasks only"
                : "Enable past mode"
            }
            style={{
              width: "auto",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8z" />
              <path d="M8 3.75a.75.75 0 0 0-.75.75v3.5H5.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 .75-.75V4.5a.75.75 0 0 0-.75-.75z" />
            </svg>
            Past
          </button>
          <button
            className={`readme-heading__add-btn bydate-toggle-btn${byDateMode ? " bydate-toggle-btn--active" : ""}`}
            onClick={() => setByDateMode((prev) => !prev)}
            aria-label={
              byDateMode ? "Disable by date view" : "Enable by date view"
            }
            aria-pressed={byDateMode}
            title={
              byDateMode
                ? "By date view on — tasks grouped by date"
                : "Group tasks by date"
            }
            style={{
              width: "auto",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h.25C13.216 2 14 2.784 14 3.75v9.5A1.75 1.75 0 0 1 12.25 15H1.75A1.75 1.75 0 0 1 0 13.25v-9.5C0 2.784.784 2 1.75 2H2V.75A.75.75 0 0 1 2.75 0h2zM1.5 6.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V6.5h-11zm11-1.5v-1.25a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25V5h11z" />
            </svg>
            By Date
          </button>
          <button
            className="readme-heading__add-btn"
            onClick={() => setHeaderModalState({ mode: "add" })}
            aria-label="Add header"
            title="Add header"
            style={{
              width: "auto",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ marginRight: "6px" }}>+</span> Add Header
          </button>
        </div>

        {!byDateMode &&
          headers.map((header, idx) => {
            const visibleTasks = header.tasks.filter(matchesFilter);

            if ((focusMode || pastMode) && visibleTasks.length === 0)
              return null;
            return (
              <section key={header._id} className="readme-section">
                {/* ── Header heading ── */}
                <div className="readme-heading">
                  <h2 className="readme-heading__text">{header.name}</h2>

                  {/* Header action buttons */}
                  <button
                    className="readme-heading__add-btn"
                    onClick={() => handleMoveHeaderUp(header._id)}
                    disabled={idx === 0}
                    aria-label="Move header up"
                    title="Move header up"
                  >
                    ↑
                  </button>
                  <button
                    className="readme-heading__add-btn"
                    onClick={() => handleMoveHeaderDown(header._id)}
                    disabled={idx === headers.length - 1}
                    aria-label="Move header down"
                    title="Move header down"
                  >
                    ↓
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
                    <svg
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286z"
                      />
                    </svg>
                  </button>
                  <button
                    className="readme-heading__add-btn"
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
                  <button
                    className="readme-heading__add-btn"
                    onClick={() => setAddTaskHeaderId(header._id)}
                    aria-label={`Add task to ${header.name}`}
                    title="Add task"
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
                      onToggleDone={handleToggleDone(header._id)}
                      onEdit={handleEditTask(header._id)}
                      onMoveUp={handleMoveTaskUp(header._id)}
                      onMoveDown={handleMoveTaskDown(header._id)}
                      onDelete={handleDeleteTask(header._id)}
                    />
                  ))}
                  {visibleTasks.length === 0 && (
                    <p className="empty-message">No tasks yet — add one!</p>
                  )}
                </div>
              </section>
            );
          })}

        {!byDateMode && (
          <>
            {headers.length === 0 && (
              <p className="empty-message">No headers yet — add one!</p>
            )}
            {focusMode &&
              pastMode &&
              headers.length > 0 &&
              headers.every(
                (h) =>
                  !h.tasks.some(
                    (t) => isTaskDueToday(t.ecd) || isTaskPast(t.ecd),
                  ),
              ) && (
                <p className="empty-message">
                  No tasks due today or in the past.
                </p>
              )}
            {focusMode &&
              !pastMode &&
              headers.length > 0 &&
              headers.every(
                (h) => !h.tasks.some((t) => isTaskDueToday(t.ecd)),
              ) && <p className="empty-message">No tasks due today.</p>}
            {!focusMode &&
              pastMode &&
              headers.length > 0 &&
              headers.every((h) => !h.tasks.some((t) => isTaskPast(t.ecd))) && (
                <p className="empty-message">No past tasks.</p>
              )}
          </>
        )}

        {byDateMode && (
          <>
            {byDateGroups.map((group) => (
              <section key={group.key} className="readme-section">
                <div className="readme-heading">
                  <h2 className="readme-heading__text">{group.label}</h2>
                </div>
                <div className="readme-tasks">
                  {group.tasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      isFirst
                      isLast
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
            {byDateGroups.length === 0 && (
              <p className="empty-message">
                No dated tasks to show
                {focusMode || pastMode ? " for this filter" : ""}.
              </p>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {deleteTarget && (
        <ConfirmModal
          message={
            deleteTarget.type === "header"
              ? `Delete header "${deleteTarget.name}" and all its tasks?`
              : `Delete task "${deleteTarget.name}"?`
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
