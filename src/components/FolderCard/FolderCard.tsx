import type { FolderCardProps } from "./FolderCard.types";
import "./FolderCard.css";

export default function FolderCard({ folder, onOpen, onDelete }: FolderCardProps) {
  const totalTodos = folder.todos.length;
  const doneTodos = folder.todos.filter((t) => t.done).length;

  return (
    <div className="folder-card" onClick={() => onOpen(folder.id)}>
      {/* Coloured tab at the top – mimics a physical folder tab */}
      <div className="folder-card__tab" style={{ background: folder.color }} />

      <button
        className="folder-card__delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(folder.id);
        }}
        aria-label={`Delete folder ${folder.name}`}
      >
        <svg viewBox="0 0 24 24" className="folder-card__delete-icon">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Folder icon */}
      <div className="folder-card__icon" style={{ color: folder.color }}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
        </svg>
      </div>

      <h3 className="folder-card__name">{folder.name}</h3>

      <div className="folder-card__meta">
        <span className="folder-card__count">
          {doneTodos}/{totalTodos} done
        </span>
        {totalTodos > 0 && (
          <div className="folder-card__progress-track">
            <div
              className="folder-card__progress-bar"
              style={{
                width: `${(doneTodos / totalTodos) * 100}%`,
                background: folder.color,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
