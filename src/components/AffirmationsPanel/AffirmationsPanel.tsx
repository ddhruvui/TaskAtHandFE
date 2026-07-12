import { useState, useEffect, useCallback } from "react";
import type { Affirmation } from "../../types";
import * as affirmationsApi from "../../api/affirmations";
import { AffirmationModal } from "../AffirmationModal";
import { ConfirmModal } from "../ConfirmModal";
import "./AffirmationsPanel.css";

export default function AffirmationsPanel() {
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [modalState, setModalState] = useState<{
    mode: "add" | "edit";
    affirmation?: Affirmation;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Affirmation | null>(null);

  const loadAffirmations = useCallback(async () => {
    try {
      const all = await affirmationsApi.getAll();
      setAffirmations(all);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAffirmations();
  }, [loadAffirmations]);

  /* ── Affirmation CRUD ── */

  const handleSaveAffirmation = async (draft: { name: string }) => {
    if (!modalState) return;
    try {
      if (modalState.mode === "add") {
        await affirmationsApi.create({ name: draft.name });
      } else {
        await affirmationsApi.update(modalState.affirmation!._id, {
          name: draft.name,
        });
      }
      await loadAffirmations();
      setModalState(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteAffirmation = async () => {
    if (!deleteTarget) return;
    try {
      await affirmationsApi.remove(deleteTarget._id);
      setAffirmations((prev) =>
        prev.filter((a) => a._id !== deleteTarget._id),
      );
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="affirmations-panel">
        <p className="empty-message">Loading affirmations…</p>
      </div>
    );
  }

  return (
    <div className="affirmations-panel">
      {error && <p className="empty-message">Action failed: {error}</p>}

      <div className="affirmations-panel__toolbar">
        <button
          className="readme-heading__add-btn affirmations-panel__add-btn"
          onClick={() => setModalState({ mode: "add" })}
          aria-label="Add affirmation"
          title="Add affirmation"
        >
          <span style={{ marginRight: "6px" }}>+</span> Add Affirmation
        </button>
      </div>

      <ul className="affirmations-panel__list">
        {affirmations.map((affirmation) => (
          <li key={affirmation._id} className="affirmations-panel__row">
            <span className="affirmations-panel__name">
              {affirmation.name}
            </span>
            <div className="affirmations-panel__actions">
              <button
                className="readme-heading__add-btn"
                onClick={() => setModalState({ mode: "edit", affirmation })}
                aria-label={`Edit affirmation ${affirmation.name}`}
                title="Edit affirmation"
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
                onClick={() => setDeleteTarget(affirmation)}
                aria-label={`Delete affirmation ${affirmation.name}`}
                title="Delete affirmation"
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
            </div>
          </li>
        ))}
      </ul>

      {affirmations.length === 0 && (
        <p className="empty-message">
          No affirmations yet — add one! An affirmation is a short line you
          read daily (e.g. "Thank you blessing").
        </p>
      )}

      {/* Modals */}
      {modalState && (
        <AffirmationModal
          affirmation={
            modalState.mode === "edit" ? modalState.affirmation : undefined
          }
          onConfirm={handleSaveAffirmation}
          onCancel={() => setModalState(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete affirmation "${deleteTarget.name}"?`}
          onConfirm={handleDeleteAffirmation}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
