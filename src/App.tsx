import { useState, useEffect, useCallback } from "react";
import { TodoCard } from "./components/TodoCard";
import { ConfirmModal } from "./components/ConfirmModal";
import { AddTaskModal } from "./components/AddTaskModal";
import type { Folder } from "./components/FolderCard";
import type { EditPayload } from "./components/TodoCard/TodoCard.types";
import * as itemsApi from "./api/items";
import * as habitsApi from "./api/habits";
import folderConfig from "./data/initialFolders.json";
import "./App.css";

// Static folder structure — todos are loaded from the API on mount.
// Each folder's `collection` maps to a backend API endpoint.
const FOLDER_CONFIG = folderConfig as Folder[];

function App() {
  const [folders, setFolders] = useState<Folder[]>(
    FOLDER_CONFIG.map((f) => ({ ...f, todos: [] })),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    folderId: string;
    id: string;
  } | null>(null);
  const [addModalFolder, setAddModalFolder] = useState<Folder | null>(null);

  /* ── helper: fetch todos for a single folder from the API ── */
  const loadFolder = useCallback(async (folder: Folder): Promise<Folder> => {
    const todos =
      folder.collection === "habbits"
        ? await habitsApi.getAll()
        : await itemsApi.getAll(folder.collection);
    return { ...folder, todos };
  }, []);

  /* ── helper: reload one folder's todos in state ── */
  const refreshFolder = useCallback(
    async (folderId: string) => {
      const folder = FOLDER_CONFIG.find((f) => f.id === folderId);
      if (!folder) return;
      const updated = await loadFolder(folder);
      setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
    },
    [loadFolder],
  );

  /* ── Load all folders from API on mount ── */
  useEffect(() => {
    let cancelled = false;

    Promise.all(FOLDER_CONFIG.map(loadFolder))
      .then((loaded) => {
        if (!cancelled) {
          setFolders(loaded);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadFolder]);

  /* ── Toggle done ── */
  // Backend automatically reorders priorities on done toggle, so refetch after.
  const handleToggleDone = (folder: Folder) => async (id: string) => {
    const todo = folder.todos.find((t) => t._id === id);
    if (!todo) return;
    try {
      if (folder.collection === "habbits") {
        await habitsApi.update(id, { done: !todo.done });
      } else {
        await itemsApi.update(folder.collection, id, { done: !todo.done });
      }
      await refreshFolder(folder.id);
    } catch (err) {
      console.error("Toggle done failed:", err);
    }
  };

  /* ── Edit notes / ECD ── */
  // Rules from API_REFERENCE.md:
  //   - habbits : send notes + ecdDayOfWeek/ecdDayOfMonth + allowRecurring:true
  //   - events  : send notes + ecd (ecd IS updatable)
  //   - others  : send notes ONLY (ecd is NOT updatable via PUT)
  const handleEdit =
    (folder: Folder) => async (id: string, payload: EditPayload) => {
      try {
        if (folder.collection === "habbits") {
          const body: habitsApi.UpdateHabitBody = {
            notes: payload.notes,
            allowRecurring: true,
          };
          if (payload.ecdDayOfWeek?.length)
            body.ecdDayOfWeek = payload.ecdDayOfWeek;
          else if (payload.ecdDayOfMonth?.length)
            body.ecdDayOfMonth = payload.ecdDayOfMonth;
          const updated = await habitsApi.update(id, body);
          setFolders((prev) =>
            prev.map((f) =>
              f.id === folder.id
                ? {
                    ...f,
                    todos: f.todos.map((t) => (t._id === id ? updated : t)),
                  }
                : f,
            ),
          );
        } else {
          const body: itemsApi.UpdateItemBody = { notes: payload.notes };
          // Only events support ecd updates via PUT
          if (folder.collection === "events" && payload.ecd !== undefined) {
            body.ecd = payload.ecd;
          }
          const updated = await itemsApi.update(folder.collection, id, body);
          setFolders((prev) =>
            prev.map((f) =>
              f.id === folder.id
                ? {
                    ...f,
                    todos: f.todos.map((t) => (t._id === id ? updated : t)),
                  }
                : f,
            ),
          );
        }
      } catch (err) {
        console.error("Edit failed:", err);
      }
    };

  /* ── Move up (decrease priority) ── */
  // Use array index for guards (priorities may be non-contiguous after deletes).
  // Send the *neighbour's actual priority* so the backend places the item correctly.
  const handleMoveUp = (folder: Folder) => async (id: string) => {
    const idx = folder.todos.findIndex((t) => t._id === id);
    if (idx <= 0) return;
    const targetPriority = folder.todos[idx - 1].priority;
    // Optimistic UI
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folder.id) return f;
        const todos = [...f.todos];
        const i = todos.findIndex((t) => t._id === id);
        if (i <= 0) return f;
        [todos[i - 1], todos[i]] = [todos[i], todos[i - 1]];
        return { ...f, todos };
      }),
    );
    try {
      if (folder.collection === "habbits") {
        await habitsApi.update(id, { priority: targetPriority });
      } else {
        await itemsApi.update(folder.collection, id, {
          priority: targetPriority,
        });
      }
    } catch (err) {
      console.error("Move up failed:", err);
      await refreshFolder(folder.id);
    }
  };

  /* ── Move down (increase priority) ── */
  const handleMoveDown = (folder: Folder) => async (id: string) => {
    const idx = folder.todos.findIndex((t) => t._id === id);
    if (idx < 0 || idx >= folder.todos.length - 1) return;
    const targetPriority = folder.todos[idx + 1].priority;
    // Optimistic UI
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folder.id) return f;
        const todos = [...f.todos];
        const i = todos.findIndex((t) => t._id === id);
        if (i < 0 || i >= todos.length - 1) return f;
        [todos[i], todos[i + 1]] = [todos[i + 1], todos[i]];
        return { ...f, todos };
      }),
    );
    try {
      if (folder.collection === "habbits") {
        await habitsApi.update(id, { priority: targetPriority });
      } else {
        await itemsApi.update(folder.collection, id, {
          priority: targetPriority,
        });
      }
    } catch (err) {
      console.error("Move down failed:", err);
      await refreshFolder(folder.id);
    }
  };

  /* ── Add task ── */
  const handleAddTodo = async (draft: Folder["todos"][0]) => {
    if (!addModalFolder) return;
    try {
      let created: Folder["todos"][0];
      if (addModalFolder.collection === "habbits") {
        // Habits require allowRecurring:true and ecdDayOfWeek or ecdDayOfMonth
        created = await habitsApi.create({
          name: draft.name,
          notes: draft.notes || undefined,
          allowRecurring: true,
          ...(draft.ecdDayOfWeek?.length
            ? { ecdDayOfWeek: draft.ecdDayOfWeek }
            : {}),
          ...(draft.ecdDayOfMonth?.length
            ? { ecdDayOfMonth: draft.ecdDayOfMonth }
            : {}),
        });
      } else {
        created = await itemsApi.create(addModalFolder.collection, {
          name: draft.name,
          notes: draft.notes || undefined,
          ecd: draft.ecd ?? undefined,
        });
      }
      setFolders((prev) =>
        prev.map((f) =>
          f.id === addModalFolder.id
            ? { ...f, todos: [...f.todos, created] }
            : f,
        ),
      );
    } catch (err) {
      console.error("Add task failed:", err);
    }
    setAddModalFolder(null);
  };

  /* ── Delete ── */
  const handleDeleteTodo = (folderId: string) => (id: string) => {
    setDeleteTarget({ folderId, id });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const folder = folders.find((f) => f.id === deleteTarget.folderId);
    if (!folder) return;
    try {
      if (folder.collection === "habbits") {
        await habitsApi.remove(deleteTarget.id);
      } else {
        await itemsApi.remove(folder.collection, deleteTarget.id);
      }
      setFolders((prev) =>
        prev.map((f) =>
          f.id === deleteTarget.folderId
            ? { ...f, todos: f.todos.filter((t) => t._id !== deleteTarget.id) }
            : f,
        ),
      );
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeleteTarget(null);
  };

  const deleteLabel = (() => {
    if (!deleteTarget) return "";
    const folder = folders.find((f) => f.id === deleteTarget.folderId);
    const t = folder?.todos.find((t) => t._id === deleteTarget.id);
    return t ? `Delete "${t.name}"?` : "";
  })();

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

  return (
    <div className="app-container">
      <h1>Task At Hand</h1>

      <div className="readme">
        {folders.map((folder) => (
          <section key={folder.id} className="readme-section">
            {/* ── Folder heading ── */}
            <div className="readme-heading">
              <h2 className="readme-heading__text">{folder.name}</h2>
              <button
                className="readme-heading__add-btn"
                onClick={() => setAddModalFolder(folder)}
                aria-label={`Add task to ${folder.name}`}
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
              {folder.todos.map((todo, idx) => (
                <TodoCard
                  key={todo._id}
                  todo={todo}
                  isFirst={idx === 0}
                  isLast={idx === folder.todos.length - 1}
                  allowRecurring={folder.allowRecurring ?? false}
                  onToggleDone={handleToggleDone(folder)}
                  onEdit={handleEdit(folder)}
                  onMoveUp={handleMoveUp(folder)}
                  onMoveDown={handleMoveDown(folder)}
                  onDelete={handleDeleteTodo(folder.id)}
                />
              ))}
              {folder.todos.length === 0 && (
                <p className="empty-message">No tasks yet — add one!</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {deleteTarget && deleteLabel && (
        <ConfirmModal
          message={deleteLabel}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {addModalFolder && (
        <AddTaskModal
          folderName={addModalFolder.name}
          allowRecurring={addModalFolder.allowRecurring ?? false}
          onConfirm={handleAddTodo}
          onCancel={() => setAddModalFolder(null)}
        />
      )}
    </div>
  );
}

export default App;
