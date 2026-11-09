import { useState, useEffect, useCallback } from "react";
import type { Affirmation } from "../../types";
import * as affirmationsApi from "../../api/affirmations";
import { AffirmationModal } from "../AffirmationModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
import { Icon } from "../Icon";
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
    // Initial load: setState happens in the promise callback, not the
    // effect body (keeps react-hooks/set-state-in-effect happy)
    affirmationsApi.getAll().then(
      (all) => {
        setAffirmations(all);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

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
      setAffirmations((prev) => prev.filter((a) => a._id !== deleteTarget._id));
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
      {error && (
        <div
          className="alert alert--danger affirmations-panel__error"
          role="alert"
        >
          <Icon name="alert" />
          <p>Action failed: {error}</p>
        </div>
      )}

      {/* Lifted into the page header (App.css .page-actions) */}
      <div className="affirmations-panel__toolbar page-actions">
        <AddButton
          ariaLabel="Add affirmation"
          onClick={() => setModalState({ mode: "add" })}
        />
      </div>

      {affirmations.length > 0 && (
        <ul className="affirmations-panel__list">
          {affirmations.map((affirmation) => (
            <li key={affirmation._id} className="affirmations-panel__row">
              <span className="affirmations-panel__mark" aria-hidden="true" />
              <span className="affirmations-panel__name">
                {affirmation.name}
              </span>
              <div className="affirmations-panel__actions">
                <button
                  className="icon-btn affirmations-panel__icon-btn"
                  onClick={() => setModalState({ mode: "edit", affirmation })}
                  aria-label={`Edit affirmation ${affirmation.name}`}
                  title="Edit affirmation"
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button
                  className="icon-btn icon-btn--danger affirmations-panel__icon-btn affirmations-panel__icon-btn--danger"
                  onClick={() => setDeleteTarget(affirmation)}
                  aria-label={`Delete affirmation ${affirmation.name}`}
                  title="Delete affirmation"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {affirmations.length === 0 && (
        <div className="app-empty-state affirmations-panel__empty">
          <span className="app-empty-state__icon" aria-hidden="true">
            <Icon name="affirmations" size={22} />
          </span>
          <p className="empty-message">No affirmations yet — add one!</p>
          <p className="app-empty-state__hint">
            An affirmation is a short line you read daily (e.g. "Thank you
            blessing").
          </p>
        </div>
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
