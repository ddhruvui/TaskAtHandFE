import { useState, useEffect, useCallback } from "react";
import type { Call, CallFrequency } from "../../types";
import * as callsApi from "../../api/calls";
import { CallModal } from "../CallModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
import { Icon } from "../Icon";
import "./CallsPanel.css";

const SECTIONS: { frequency: CallFrequency; title: string }[] = [
  { frequency: "biweekly", title: "Biweekly" },
  { frequency: "monthly", title: "Monthly" },
];

export default function CallsPanel() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [modalState, setModalState] = useState<{
    mode: "add" | "edit";
    call?: Call;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Call | null>(null);

  const loadCalls = useCallback(async () => {
    try {
      const all = await callsApi.getAll();
      setCalls(all);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load: setState happens in the promise callback, not the
    // effect body (keeps react-hooks/set-state-in-effect happy)
    callsApi.getAll().then(
      (all) => {
        setCalls(all);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  /* ── Call CRUD (no optimistic updates: mutate via API, then refetch) ── */

  const handleSaveCall = async (draft: {
    name: string;
    frequency: CallFrequency;
  }) => {
    if (!modalState) return;
    try {
      if (modalState.mode === "add") {
        await callsApi.create({
          name: draft.name,
          frequency: draft.frequency,
        });
      } else {
        await callsApi.update(modalState.call!._id, {
          name: draft.name,
          frequency: draft.frequency,
        });
      }
      await loadCalls();
      setModalState(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleCalled = async (call: Call) => {
    try {
      await callsApi.update(call._id, { done: !call.done });
      await loadCalls();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteCall = async () => {
    if (!deleteTarget) return;
    try {
      await callsApi.remove(deleteTarget._id);
      await loadCalls();
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="calls-panel">
        <p className="empty-message">Loading calls…</p>
      </div>
    );
  }

  return (
    <div className="calls-panel">
      {error && (
        <div className="alert alert--danger calls-panel__error" role="alert">
          <Icon name="alert" />
          <p>Action failed: {error}</p>
        </div>
      )}

      {/* Lifted into the page header (App.css .page-actions) */}
      <div className="calls-panel__toolbar page-actions">
        <AddButton
          ariaLabel="Add call"
          onClick={() => setModalState({ mode: "add" })}
        />
      </div>

      {calls.length === 0 ? (
        <div className="app-empty-state calls-panel__empty">
          <span className="app-empty-state__icon" aria-hidden="true">
            <Icon name="calls" size={22} />
          </span>
          <p className="empty-message">No calls yet — add one!</p>
          <p className="app-empty-state__hint">
            A call is someone you must ring biweekly (twice a month) or monthly.
          </p>
        </div>
      ) : (
        SECTIONS.map(({ frequency, title }) => {
          const sectionCalls = calls.filter((c) => c.frequency === frequency);
          const calledCount = sectionCalls.filter((c) => c.done).length;
          return (
            <section
              key={frequency}
              className={`readme-section calls-panel__section calls-panel__section--${frequency}`}
            >
              <div className="readme-heading calls-panel__heading">
                <div className="readme-heading__title">
                  <h3 className="readme-heading__text calls-panel__section-title">
                    {title}
                  </h3>
                  {sectionCalls.length > 0 && (
                    <span
                      className="readme-heading__count calls-panel__count"
                      title={`${calledCount} of ${sectionCalls.length} called`}
                    >
                      {calledCount}/{sectionCalls.length}
                    </span>
                  )}
                </div>
              </div>
              {sectionCalls.length > 0 && (
                <ul className="readme-tasks calls-panel__list">
                  {sectionCalls.map((call) => (
                    <li
                      key={call._id}
                      className={`calls-panel__row${call.done ? " calls-panel__row--done" : ""}`}
                    >
                      <button
                        className={`calls-panel__checkbox${call.done ? " calls-panel__checkbox--checked" : ""}`}
                        onClick={() => handleToggleCalled(call)}
                        aria-label={
                          call.done
                            ? `Mark ${call.name} as not called`
                            : `Mark ${call.name} as called`
                        }
                        title={
                          call.done ? "Mark as not called" : "Mark as called"
                        }
                      >
                        {call.done && (
                          <Icon
                            name="check"
                            size={12}
                            strokeWidth={3.5}
                            className="calls-panel__check-icon"
                          />
                        )}
                      </button>
                      <span
                        className={`calls-panel__name${call.done ? " calls-panel__name--done" : ""}`}
                      >
                        {call.name}
                      </span>
                      <div className="calls-panel__actions">
                        <button
                          className="icon-btn calls-panel__icon-btn"
                          onClick={() => setModalState({ mode: "edit", call })}
                          aria-label={`Edit call ${call.name}`}
                          title="Edit call"
                        >
                          <Icon name="pencil" size={15} />
                        </button>
                        <button
                          className="icon-btn icon-btn--danger calls-panel__icon-btn calls-panel__icon-btn--danger"
                          onClick={() => setDeleteTarget(call)}
                          aria-label={`Delete call ${call.name}`}
                          title="Delete call"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {sectionCalls.length === 0 && (
                <p className="empty-message calls-panel__section-empty">
                  No {frequency} calls.
                </p>
              )}
            </section>
          );
        })
      )}

      {/* Modals */}
      {modalState && (
        <CallModal
          call={modalState.mode === "edit" ? modalState.call : undefined}
          onConfirm={handleSaveCall}
          onCancel={() => setModalState(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete call "${deleteTarget.name}"?`}
          onConfirm={handleDeleteCall}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
