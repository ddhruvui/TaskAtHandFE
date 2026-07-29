import { useState, useEffect, useCallback, useRef } from "react";
import type { Project, ProjectTask } from "../../types";
import * as projectsApi from "../../api/projects";
import * as headersApi from "../../api/headers";
import * as tasksApi from "../../api/tasks";
import { ProjectModal } from "../ProjectModal";
import { ProjectTaskModal } from "../ProjectTaskModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
// Task rows reuse the todo's row styling (.task-card*) so the two lists stay
// visually identical from one source. Imported explicitly rather than relying
// on TaskCard being mounted elsewhere in the tree.
import "../TaskCard/TaskCard.css";
import "./ProjectsPanel.css";

interface ProjectsPanelProps {
  /** Called after the todo was touched (task added/removed/edited), so it can reload. */
  onTasksChanged: () => void;
}

/**
 * Whether two tasks sit in the same movable group. The server sorts a
 * project's tasks into dated-undone, undated-undone and done, so a swap
 * across those lines would be reverted on the next write.
 */
function sameMoveGroup(a: ProjectTask, b: ProjectTask): boolean {
  return a.done === b.done && (a.done || !!a.date === !!b.date);
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
  // Synchronous re-entrancy guard for the task save flow: `busy` (state) only
  // disables the modal button after a re-render, which leaves a window where a
  // fast second click re-enters handleSaveTask and creates a duplicate linked
  // todo task. A ref flips before the first await, so the re-entry is dropped.
  const savingTaskRef = useRef(false);

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
   * under the project's own header. The header is identified by `projectId`;
   * creating it is the backend's job (see createTodoTask), including where it
   * sits in the header list. */

  const findProjectHeader = async (project: Project) => {
    const all = await headersApi.getAll();
    return (
      all.find((h) => h.projectId === project._id) ??
      // Header created before projectId existed — matched by name until the
      // server adopts it on the next project header create/cron run.
      all.find(
        (h) =>
          h.projectId == null &&
          h.name.trim().toLowerCase() === project.name.trim().toLowerCase(),
      )
    );
  };

  /**
   * The note the linked todo task carries: the project task's own notes when
   * it has any, else the "Step towards …" default that flags the origin.
   */
  const todoNoteFor = (projectName: string, notes: string): string =>
    notes.trim() ? notes : `Step towards "${projectName}"`;

  /**
   * Create the linked todo task for a dated project task; returns its _id.
   *
   * The header comes straight from `POST /headers { name, projectId }`: that
   * call is idempotent per project (it returns the existing header, adopting
   * a legacy name-matched one if needed) and the server places it in the
   * projects' priority order, so there is nothing to find-or-create or
   * re-order here.
   */
  const createTodoTask = async (
    project: Project,
    taskName: string,
    date: string,
    notes: string,
  ): Promise<string> => {
    const header = await headersApi.create({
      name: project.name,
      projectId: project._id,
    });
    const created = await tasksApi.create({
      name: taskName,
      headerId: header._id,
      notes: todoNoteFor(project.name, notes),
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
        // The server renames the linked todo header as part of the update;
        // just reload the todo so it shows the new name.
        if (name.trim().toLowerCase() !== project.name.trim().toLowerCase()) {
          onTasksChanged();
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
      // The server unlinked the project's header and closed the block, so the
      // todo's header order changed even though no task did.
      onTasksChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMoveProject = async (project: Project, delta: -1 | 1) => {
    try {
      // The server mirrors the new project order onto the todo's project
      // headers as part of this update.
      await projectsApi.update(project._id, {
        priority: project.priority + delta,
      });
      await loadProjects();
      onTasksChanged();
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

  const handleSaveTask = async (draft: {
    name: string;
    notes: string;
    date: string | null;
  }) => {
    if (!taskModalState || savingTaskRef.current) return;
    savingTaskRef.current = true;
    const { project, taskIndex } = taskModalState;
    setBusy(true);
    try {
      let todoTouched = false;

      if (taskIndex === undefined) {
        // Add: a dated task is mirrored into the todo immediately
        let todoTaskId: string | null = null;
        if (draft.date) {
          todoTaskId = await createTodoTask(
            project,
            draft.name,
            draft.date,
            draft.notes,
          );
          todoTouched = true;
        }
        await replaceTasks(project, [
          ...project.tasks,
          {
            name: draft.name,
            notes: draft.notes,
            date: draft.date,
            done: false,
            todoTaskId,
          },
        ]);
      } else {
        // Edit: keep the linked todo task in step with name/date/notes changes
        const current = project.tasks[taskIndex];
        let todoTaskId = current.todoTaskId;
        if (draft.date) {
          if (todoTaskId) {
            if (
              current.name !== draft.name ||
              current.date !== draft.date ||
              current.notes !== draft.notes
            ) {
              await tasksApi.update(todoTaskId, {
                name: draft.name,
                notes: todoNoteFor(project.name, draft.notes),
                ecd: { type: "date", value: draft.date },
              });
              todoTouched = true;
            }
          } else if (!current.done) {
            todoTaskId = await createTodoTask(
              project,
              draft.name,
              draft.date,
              draft.notes,
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
              ? {
                  ...t,
                  name: draft.name,
                  notes: draft.notes,
                  date: draft.date,
                  todoTaskId,
                }
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
      savingTaskRef.current = false;
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
        todoTaskId = await createTodoTask(
          project,
          task.name,
          task.date,
          task.notes,
        );
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
        const header = await findProjectHeader(project);
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
        <AddButton
          label="Add Project"
          ariaLabel="Add project"
          onClick={() => setProjectModalState({ mode: "add" })}
        />
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

            <div className="readme-tasks">
              {project.tasks.map((task, taskIdx) => {
                const prev = project.tasks[taskIdx - 1];
                const next = project.tasks[taskIdx + 1];
                // Moves never cross the done/undone barrier (same as the todo)
                // nor the dated/undated one the server enforces among undone
                // tasks, so the panel can't offer a swap the server undoes.
                const canMoveUp = taskIdx > 0 && sameMoveGroup(prev, task);
                const canMoveDown =
                  taskIdx < project.tasks.length - 1 &&
                  sameMoveGroup(next, task);
                return (
                  <div
                    key={`${task.name}-${taskIdx}`}
                    className={`task-card projects-panel__task-row${task.done ? " task-card--done projects-panel__task-row--done" : ""}`}
                  >
                    <div className="task-card__header">
                      <button
                        className={`task-card__checkbox${task.done ? " task-card__checkbox--checked" : ""}`}
                        onClick={() => handleToggleTaskDone(project, taskIdx)}
                        disabled={busy}
                        aria-label={`Toggle task ${task.name}`}
                        title={task.done ? "Mark not done" : "Mark done"}
                      >
                        {task.done && (
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
                          <span
                            className={`task-card__name projects-panel__task-name${task.done ? " task-card__name--done" : ""}`}
                          >
                            {task.name}
                          </span>
                          {/* Same slot the todo uses for the ECD badge; only a
                              dated task carries the panel's date hook. */}
                          {task.date ? (
                            <span
                              className="task-card__ecd projects-panel__task-date"
                              title={
                                task.done
                                  ? `Was due ${task.date}`
                                  : `In the todo under "${project.name}" — due ${task.date}`
                              }
                            >
                              [ {formatTaskDate(task.date)} ]
                            </span>
                          ) : (
                            <span className="task-card__ecd">[ No date ]</span>
                          )}
                          {task.notes && (
                            <span className="task-card__arrow">=&gt;</span>
                          )}
                        </span>
                        {task.notes && (
                          <span className="task-card__notes-text projects-panel__task-notes">
                            {task.notes}
                          </span>
                        )}
                      </span>

                      <div className="task-card__actions">
                        <button
                          className="task-card__action-btn"
                          onClick={() =>
                            setTaskModalState({ project, taskIndex: taskIdx })
                          }
                          disabled={busy}
                          aria-label={`Edit task ${task.name}`}
                          title="Edit task"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="task-card__action-icon"
                          >
                            <path
                              fillRule="evenodd"
                              d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286z"
                            />
                          </svg>
                        </button>
                        <button
                          className="task-card__action-btn"
                          onClick={() => handleMoveTask(project, taskIdx, 1)}
                          disabled={busy || !canMoveDown}
                          aria-label={`Move task ${task.name} down`}
                          title="Move task down"
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
                          onClick={() => handleMoveTask(project, taskIdx, -1)}
                          disabled={busy || !canMoveUp}
                          aria-label={`Move task ${task.name} up`}
                          title="Move task up"
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
                            setDeleteTaskTarget({ project, taskIndex: taskIdx })
                          }
                          disabled={busy}
                          aria-label={`Delete task ${task.name}`}
                          title="Delete task"
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
          busy={busy}
          projectName={taskModalState.project.name}
          task={
            taskModalState.taskIndex !== undefined
              ? {
                  name: taskModalState.project.tasks[taskModalState.taskIndex]
                    .name,
                  notes:
                    taskModalState.project.tasks[taskModalState.taskIndex]
                      .notes,
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
