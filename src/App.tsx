import { useState } from "react";
import { TodoCard } from "./components/TodoCard";
import { ConfirmModal } from "./components/ConfirmModal";
import type { Folder } from "./components/FolderCard";
import initialFolders from "./data/initialFolders.json";
import "./App.css";

function App() {
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [activeTabId, setActiveTabId] = useState<string>(initialFolders[0]?.id ?? "");
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "folder" | "todo";
    id: string;
  } | null>(null);

  const activeFolder = folders.find((f) => f.id === activeTabId) ?? folders[0] ?? null;

  /* ---------- helpers to map into nested folder→todos ---------- */

  const updateTodoInFolder = (
    folderId: string,
    todoId: string,
    updater: (t: (typeof folders)[0]["todos"][0]) => (typeof folders)[0]["todos"][0],
  ) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, todos: f.todos.map((t) => (t.id === todoId ? updater(t) : t)) }
          : f,
      ),
    );
  };

  /* ---------- todo handlers (scoped to open folder) ---------- */

  const handleToggleDone = (id: string) => {
    if (!activeFolder) return;
    updateTodoInFolder(activeFolder.id, id, (t) => ({
      ...t,
      done: !t.done,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    if (!activeFolder) return;
    updateTodoInFolder(activeFolder.id, id, (t) => ({
      ...t,
      notes,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handlePriorityChange = (id: string, direction: "up" | "down") => {
    if (!activeFolder) return;
    updateTodoInFolder(activeFolder.id, id, (t) => {
      const next = direction === "up" ? t.priority - 1 : t.priority + 1;
      if (next < 1 || next > 5) return t;
      return { ...t, priority: next, updatedAt: new Date().toISOString() };
    });
  };

  /* ---------- delete logic ---------- */

  const handleDeleteTodo = (id: string) => {
    setDeleteTarget({ type: "todo", id });
  };

  const handleDeleteFolder = (id: string) => {
    setDeleteTarget({ type: "folder", id });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "folder") {
      const remaining = folders.filter((f) => f.id !== deleteTarget.id);
      setFolders(remaining);
      if (activeTabId === deleteTarget.id) {
        setActiveTabId(remaining[0]?.id ?? "");
      }
    } else if (activeFolder) {
      setFolders((prev) =>
        prev.map((f) =>
          f.id === activeFolder.id
            ? { ...f, todos: f.todos.filter((t) => t.id !== deleteTarget.id) }
            : f,
        ),
      );
    }

    setDeleteTarget(null);
  };

  const deleteLabel = (() => {
    if (!deleteTarget) return "";
    if (deleteTarget.type === "folder") {
      const f = folders.find((f) => f.id === deleteTarget.id);
      return f ? `Delete folder "${f.name}" and all its tasks?` : "";
    }
    if (activeFolder) {
      const t = activeFolder.todos.find((t) => t.id === deleteTarget.id);
      return t ? `Delete "${t.name}"?` : "";
    }
    return "";
  })();

  /* ---------- render ---------- */

  return (
    <div className="app-container">
      <h1>Task At Hand</h1>

      {/* ── Folder tabs ── */}
      {folders.length > 0 && (
        <div className="folder-tabs">
          {folders.map((folder) => {
            const isActive = activeFolder?.id === folder.id;
            return (
              <button
                key={folder.id}
                className={`folder-tab ${isActive ? "folder-tab--active" : ""}`}
                style={
                  {
                    "--tab-color": folder.color,
                  } as React.CSSProperties
                }
                onClick={() => setActiveTabId(folder.id)}
              >
                <svg
                  className="folder-tab__icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
                </svg>
                <span className="folder-tab__label">{folder.name}</span>
                <span className="folder-tab__badge">
                  {folder.todos.filter((t) => !t.done).length}
                </span>
                <span
                  className="folder-tab__close"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id);
                    }
                  }}
                  aria-label={`Delete ${folder.name}`}
                >
                  &times;
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active folder's todos ── */}
      {activeFolder ? (
        <div className="todo-grid">
          {activeFolder.todos.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onToggleDone={handleToggleDone}
              onNotesChange={handleNotesChange}
              onPriorityChange={handlePriorityChange}
              onDelete={handleDeleteTodo}
            />
          ))}
          {activeFolder.todos.length === 0 && (
            <p className="empty-message">No tasks yet — add one!</p>
          )}
        </div>
      ) : (
        <p className="empty-message">No folders yet — create one!</p>
      )}

      {deleteTarget && deleteLabel && (
        <ConfirmModal
          message={deleteLabel}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default App;
