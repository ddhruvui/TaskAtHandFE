import { useState, useEffect, useCallback } from "react";
import type { Project, ProjectTask } from "../../types";
import * as projectsApi from "../../api/projects";
import * as headersApi from "../../api/headers";
import * as tasksApi from "../../api/tasks";
import { ProjectModal } from "../ProjectModal";
import { ProjectTaskModal } from "../ProjectTaskModal";
import { ConfirmModal } from "../ConfirmModal";
import "./ProjectsPanel.css";

interface ProjectsPanelProps {
  /** Called after the todo was touched (task added/removed/edited), so it can reload. */
  onTasksChanged: () => void;
}

/** `MM/DD` like the todo's date display; adds `/YY` when not the current year. */
function formatTaskDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const label = `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
  return y === new Date().getFullYear()
    ? label
    : `${label}/${String(y % 100).padStart(2, "0")}`;
}

export default function ProjectsPanel({ onTasksChanged }: ProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modal states
  const [projectModalState, setProjectModalState] = useState<{
    mode: "add" | "edit";
    project?: Project;
  } | null>(null);
  const [taskModalState, setTaskModalState] = useState<{
    project: Project;
    taskIndex?: number; // present when editing
  } | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] =
    useState<Project | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<{
    project: Project;
    taskIndex: number;
  } | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const all = await projectsApi.getAll();
      setProjects(all);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  /* ── Todo link helpers ──
   * A project task with a date lives in the todo as a one-time date task
   * under a header named after the project (reused case-insensitively when
   * one exists, created otherwise — same find-or-create pattern as event
   * scheduling and goal steps). */

  const findProjectHeader = async (projectName: string) => {
    const all = await headersApi.getAll();
    return all.find(
      (h) => h.name.trim().toLowerCase() === projectName.trim().toLowerCase(),
    );
  };

  /** Create the linked todo task for a dated project task; returns its _id. */
  const createTodoTask = async (
    projectName: string,
    taskName: string,
    date: string,
  ): Promise<string> => {
    const header =
      (await findProjectHeader(projectName)) ??
      (await headersApi.create({ name: projectName }));
    const created = await tasksApi.create({
      name: taskName,
      headerId: header._id,
      notes: `Step towards "${projectName}"`,
      ecd: { type: "date", value: date },
    });
    return created._id;
  };

  /* ── Project CRUD ── */

  const handleSaveProject = async (name: string) => {
    if (!projectModalState) return;
    try {
      if (projectModalState.mode === "add") {
        await projectsApi.create({ name });
      } else {
        const project = projectModalState.project!;
        await projectsApi.update(project._id, { name });
        // Keep the todo header in sync with the project name
        if (name.trim().toLowerCase() !== project.name.trim().toLowerCase()) {
          const header = await findProjectHeader(project.name);
          if (header) {
            await headersApi.update(header._id, { name });
            onTasksChanged();
          }
        }
      }
      await loadProjects();
      setProjectModalState(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectTarget) return;
    try {
      await projectsApi.remove(deleteProjectTarget._id);
      await loadProjects();
      setDeleteProjectTarget(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMoveProject = async (project: Project, delta: -1 | 1) => {
    try {
      await projectsApi.update(project._id, {
        priority: project.priority + delta,
      });
      await loadProjects();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      await loadProjects();
    }
  };

  /* ── Task CRUD ── */

  const replaceTasks = async (project: Project, tasks: ProjectTask[]) => {
    await projectsApi.update(project._id, { tasks });
    await loadProjects();
  };

  const handleSaveTask = async (draft: { name: string; date: string | null }) => {
    if (!taskModalState) return;
    const { project, taskIndex } = taskModalState;
    setBusy(true);
    try {
      let todoTouched = false;

      if (taskIndex === undefined) {
        // Add: a dated task is mirrored into the todo immediately
        let todoTaskId: string | null = null;
        if (draft.date) {
          todoTaskId = await createTodoTask(project.name, draft.name, draft.date);
          todoTouched = true;
        }
        await replaceTasks(project, [
          ...project.tasks,
          { name: draft.name, date: draft.date, done: false, todoTaskId },
        ]);
      } else {
        // Edit: keep the linked todo task in step with name/date changes
        const current = project.tasks[taskIndex];
        let todoTaskId = current.todoTaskId;
        if (draft.date) {
          if (todoTaskId) {
            if (
              current.name !== draft.name ||
              current.date !== draft.date
            ) {
              await tasksApi.update(todoTaskId, {
                name: draft.name,
                ecd: { type: "date", value: draft.date },
              });
              todoTouched = true;
            }
          } else if (!current.done) {
            todoTaskId = await createTodoTask(
              project.name,
              draft.name,
              draft.date,
            );
            todoTouched = true;
          }
        } else if (todoTaskId) {
          // Date removed — the todo task no longer belongs there
          await tasksApi.remove(todoTaskId, "Removed from long term project");
          todoTaskId = null;
          todoTouched = true;
        }
        await replaceTasks(
          project,
          project.tasks.map((t, i) =>
            i === taskIndex
              ? { ...t, name: draft.name, date: draft.date, todoTaskId }
              : t,
          ),
        );
      }

      setTaskModalState(null);
      setError(null);
      if (todoTouched) onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleTaskDone = async (project: Project, taskIndex: number) => {
    const task = project.tasks[taskIndex];
    const done = !task.done;
    setBusy(true);
    try {
      let todoTaskId = task.todoTaskId;
      let todoTouched = false;
      if (todoTaskId) {
        try {
          await tasksApi.update(todoTaskId, { done });
          todoTouched = true;
        } catch {
          // Linked todo task is gone (deleted outside this panel) — drop the
          // stale link and carry on with the project-side toggle
          todoTaskId = null;
        }
      } else if (!done && task.date) {
        // Undoing after the cron consumed the link: the dated task returns
        // to the todo
        todoTaskId = await createTodoTask(project.name, task.name, task.date);
        todoTouched = true;
      }
      await replaceTasks(
        project,
        project.tasks.map((t, i) =>
          i === taskIndex ? { ...t, done, todoTaskId } : t,
        ),
      );
      setError(null);
      if (todoTouched) onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleMoveTask = async (
    project: Project,
    taskIndex: number,
    delta: -1 | 1,
  ) => {
    const target = taskIndex + delta;
    const tasks = [...project.tasks];
    [tasks[taskIndex], tasks[target]] = [tasks[target], tasks[taskIndex]];
    try {
      await replaceTasks(project, tasks);
      // Mirror the swap into the todo when both tasks live there: the moved
      // task takes the other's todo priority (the backend shifts the rest)
      const moved = project.tasks[taskIndex];
      const other = project.tasks[target];
      if (moved.todoTaskId && other.todoTaskId) {
        const header = await findProjectHeader(project.name);
        if (header) {
          const todoTasks = await tasksApi.getAll(header._id);
          const movedTodo = todoTasks.find((t) => t._id === moved.todoTaskId);
          const otherTodo = todoTasks.find((t) => t._id === other.todoTaskId);
          const orderMismatch =
            movedTodo &&
            otherTodo &&
            (delta === -1
              ? movedTodo.priority > otherTodo.priority
              : movedTodo.priority < otherTodo.priority);
          if (orderMismatch) {
            await tasksApi.update(movedTodo._id, {
              priority: otherTodo.priority,
            });
            onTasksChanged();
          }
        }
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const confirmDeleteTask = async () => {
    if (!deleteTaskTarget) return;
    const { project, taskIndex } = deleteTaskTarget;
    const task = project.tasks[taskIndex];
    setBusy(true);
    try {
      let todoTouched = false;
      if (task.todoTaskId) {
        try {
          await tasksApi.remove(
            task.todoTaskId,
            task.done ? undefined : "Removed from long term project",
          );
          todoTouched = true;
        } catch {
          // Already gone — nothing to clean up
        }
      }
      await replaceTasks(
        project,
        project.tasks.filter((_, i) => i !== taskIndex),
      );
      setDeleteTaskTarget(null);
      setError(null);
      if (todoTouched) onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="projects-panel">
        <p className="empty-message">Loading projects…</p>
      </div>
    );
  }

  return (
    <div className="projects-panel">
      {error && <p className="empty-message">Action failed: {error}</p>}

      <div className="projects-panel__toolbar">
        <button
          className="readme-heading__add-btn projects-panel__add-project-btn"
          onClick={() => setProjectModalState({ mode: "add" })}
          aria-label="Add project"
          title="Add project"
        >
          <span style={{ marginRight: "6px" }}>+</span> Add Project
        </button>
      </div>

      {projects.map((project, idx) => {
        const doneCount = project.tasks.filter((t) => t.done).length;
        return (
          <section key={project._id} className="readme-section">
            <div className="readme-heading">
              <h2 className="readme-heading__text">{project.name}</h2>

              {project.tasks.length > 0 && (
                <span
                  className="projects-panel__progress"
                  title={`${doneCount} of ${project.tasks.length} tasks done`}
                >
                  {doneCount}/{project.tasks.length} done
                </span>
              )}
              <button
                className="readme-heading__add-btn"
                onClick={() => handleMoveProject(project, -1)}
                disabled={idx === 0}
                aria-label={`Move project ${project.name} up`}
                title="Move project up"
              >
                ↑
              </button>
              <button
                className="readme-heading__add-btn"
                onClick={() => handleMoveProject(project, 1)}
                disabled={idx === projects.length - 1}
                aria-label={`Move project ${project.name} down`}
                title="Move project down"
              >
                ↓
              </button>
              <button
                className="readme-heading__add-btn"
                onClick={() => setProjectModalState({ mode: "edit", project })}
                aria-label={`Edit project ${project.name}`}
                title="Edit project name"
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
                onClick={() => setDeleteProjectTarget(project)}
                aria-label={`Delete project ${project.name}`}
                title="Delete project"
                style={{ color: "#e74c3c" }}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 1 0-1.492.141l.6 6.35A1.5 1.5 0 0 0 5.1 14.4h5.8a1.5 1.5 0 0 0 1.496-1.35l.6-6.35a.75.75 0 1 0-1.492-.141l-.6 6.33a.008.008 0 0 1-.007.011H5.104a.008.008 0 0 1-.007-.01l-.6-6.332z"
                  />
                </svg>
              </button>
              <button
                className="readme-heading__add-btn"
                onClick={() => setTaskModalState({ project })}
                aria-label={`Add task to ${project.name}`}
                title="Add task"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z" />
                </svg>
              </button>
            </div>

            <div className="projects-panel__task-list">
              {project.tasks.map((task, taskIdx) => {
                const prev = project.tasks[taskIdx - 1];
                const next = project.tasks[taskIdx + 1];
                // Moves never cross the done/undone barrier (same as the todo)
                const canMoveUp = taskIdx > 0 && prev.done === task.done;
                const canMoveDown =
                  taskIdx < project.tasks.length - 1 &&
                  next.done === task.done;
                return (
                  <div
                    key={`${task.name}-${taskIdx}`}
                    className={`projects-panel__task-row${task.done ? " projects-panel__task-row--done" : ""}`}
                  >
                    <button
                      className={`projects-panel__task-check${task.done ? " projects-panel__task-check--done" : ""}`}
                      onClick={() => handleToggleTaskDone(project, taskIdx)}
                      disabled={busy}
                      aria-label={`Toggle task ${task.name}`}
                      title={task.done ? "Mark not done" : "Mark done"}
                    >
                      {task.done ? "✓" : ""}
                    </button>
                    <span className="projects-panel__task-name">
                      {task.name}
                    </span>
                    {task.date && (
                      <span
                        className="projects-panel__task-date"
                        title={
                          task.done
                            ? `Was due ${task.date}`
                            : `In the todo under "${project.name}" — due ${task.date}`
                        }
                      >
                        {formatTaskDate(task.date)}
                      </span>
                    )}
                    <div className="projects-panel__task-actions">
                      <button
                        className="readme-heading__add-btn"
                        onClick={() => handleMoveTask(project, taskIdx, -1)}
                        disabled={busy || !canMoveUp}
                        aria-label={`Move task ${task.name} up`}
                        title="Move task up"
                      >
                        ↑
                      </button>
                      <button
                        className="readme-heading__add-btn"
                        onClick={() => handleMoveTask(project, taskIdx, 1)}
                        disabled={busy || !canMoveDown}
                        aria-label={`Move task ${task.name} down`}
                        title="Move task down"
                      >
                        ↓
                      </button>
                      <button
                        className="readme-heading__add-btn"
                        onClick={() =>
                          setTaskModalState({ project, taskIndex: taskIdx })
                        }
                        disabled={busy}
                        aria-label={`Edit task ${task.name}`}
                        title="Edit task"
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
                        onClick={() =>
                          setDeleteTaskTarget({ project, taskIndex: taskIdx })
                        }
                        disabled={busy}
                        aria-label={`Delete task ${task.name}`}
                        title="Delete task"
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
                  </div>
                );
              })}
              {project.tasks.length === 0 && (
                <p className="projects-panel__no-tasks">
                  No tasks yet — add the steps that get this project done.
                </p>
              )}
            </div>
          </section>
        );
      })}

      {projects.length === 0 && (
        <p className="empty-message">
          No projects yet — add one! A long term project (e.g. "Automated
          Stock Market") lists the steps that get it done (e.g. "get data
          from EODHD"). Give a step a date and it shows up in the todo under
          the project's name; once it's done and the nightly cleanup runs, it
          leaves the todo but stays here as a completed step.
        </p>
      )}

      {/* Modals */}
      {projectModalState && (
        <ProjectModal
          projectName={
            projectModalState.mode === "edit"
              ? projectModalState.project!.name
              : undefined
          }
          onConfirm={handleSaveProject}
          onCancel={() => setProjectModalState(null)}
        />
      )}

      {taskModalState && (
        <ProjectTaskModal
          projectName={taskModalState.project.name}
          task={
            taskModalState.taskIndex !== undefined
              ? {
                  name: taskModalState.project.tasks[taskModalState.taskIndex]
                    .name,
                  date: taskModalState.project.tasks[taskModalState.taskIndex]
                    .date,
                }
              : undefined
          }
          onConfirm={handleSaveTask}
          onCancel={() => setTaskModalState(null)}
        />
      )}

      {deleteProjectTarget && (
        <ConfirmModal
          message={`Delete project "${deleteProjectTarget.name}"? Tasks already added to the todo stay.`}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteProjectTarget(null)}
        />
      )}

      {deleteTaskTarget && (
        <ConfirmModal
          message={`Delete task "${deleteTaskTarget.project.tasks[deleteTaskTarget.taskIndex].name}" from "${deleteTaskTarget.project.name}"?${deleteTaskTarget.project.tasks[deleteTaskTarget.taskIndex].todoTaskId ? " Its todo entry is removed too." : ""}`}
          onConfirm={confirmDeleteTask}
          onCancel={() => setDeleteTaskTarget(null)}
        />
      )}
    </div>
  );
}
