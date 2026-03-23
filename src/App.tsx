import { useState } from "react";
import { TodoCard } from "./components/TodoCard";
import { ConfirmModal } from "./components/ConfirmModal";
import { AddTaskModal } from "./components/AddTaskModal";
import type { Folder } from "./components/FolderCard";
import initialFolders from "./data/initialFolders.json";
import "./App.css";

function App() {
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [deleteTarget, setDeleteTarget] = useState<{
    folderId: string;
    id: string;
  } | null>(null);
  const [addModalFolder, setAddModalFolder] = useState<Folder | null>(null);

  /* ---------- helpers ---------- */

  const updateTodoInFolder = (
    folderId: string,
    todoId: string,
    updater: (t: Folder["todos"][0]) => Folder["todos"][0],
  ) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              todos: f.todos.map((t) => (t.id === todoId ? updater(t) : t)),
            }
          : f,
      ),
    );
  };

  /* ---------- todo handlers ---------- */

  const handleToggleDone = (folderId: string) => (id: string) => {
    updateTodoInFolder(folderId, id, (t) => ({
      ...t,
      done: !t.done,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleEdit =
    (folderId: string) =>
    (
      id: string,
      payload: import("./components/TodoCard/TodoCard.types").EditPayload,
    ) => {
      updateTodoInFolder(folderId, id, (t) => ({
        ...t,
        notes: payload.notes,
        ecd: payload.ecd,
        ecdDayOfWeek: payload.ecdDayOfWeek,
        ecdDayOfMonth: payload.ecdDayOfMonth,
        updatedAt: new Date().toISOString(),
      }));
    };

  const handleMoveUp = (folderId: string) => (id: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        const todos = [...f.todos];
        const idx = todos.findIndex((t) => t.id === id);
        if (idx <= 0) return f;
        [todos[idx - 1], todos[idx]] = [todos[idx], todos[idx - 1]];
        return { ...f, todos };
      }),
    );
  };

  const handleMoveDown = (folderId: string) => (id: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        const todos = [...f.todos];
        const idx = todos.findIndex((t) => t.id === id);
        if (idx < 0 || idx >= todos.length - 1) return f;
        [todos[idx], todos[idx + 1]] = [todos[idx + 1], todos[idx]];
        return { ...f, todos };
      }),
    );
  };

  /* ---------- add task ---------- */

  const handleAddTodo = (todo: Folder["todos"][0]) => {
    if (!addModalFolder) return;
    setFolders((prev) =>
      prev.map((f) =>
        f.id === addModalFolder.id ? { ...f, todos: [...f.todos, todo] } : f,
      ),
    );
    setAddModalFolder(null);
  };

  /* ---------- delete logic ---------- */

  const handleDeleteTodo = (folderId: string) => (id: string) => {
    setDeleteTarget({ folderId, id });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setFolders((prev) =>
      prev.map((f) =>
        f.id === deleteTarget.folderId
          ? { ...f, todos: f.todos.filter((t) => t.id !== deleteTarget.id) }
          : f,
      ),
    );
    setDeleteTarget(null);
  };

  const deleteLabel = (() => {
    if (!deleteTarget) return "";
    const folder = folders.find((f) => f.id === deleteTarget.folderId);
    if (folder) {
      const t = folder.todos.find((t) => t.id === deleteTarget.id);
      return t ? `Delete "${t.name}"?` : "";
    }
    return "";
  })();

  /* ---------- render ---------- */

  return (
    <div className="app-container">
      <h1>Task At Hand</h1>

      <div className="readme">
        {folders.length === 0 && (
          <p className="empty-message">No folders yet — create one!</p>
        )}

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
                  key={todo.id}
                  todo={todo}
                  isFirst={idx === 0}
                  isLast={idx === folder.todos.length - 1}
                  allowRecurring={folder.allowRecurring ?? false}
                  onToggleDone={handleToggleDone(folder.id)}
                  onEdit={handleEdit(folder.id)}
                  onMoveUp={handleMoveUp(folder.id)}
                  onMoveDown={handleMoveDown(folder.id)}
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
