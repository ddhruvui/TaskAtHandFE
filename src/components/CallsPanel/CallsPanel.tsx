import { useState, useEffect, useCallback } from "react";
import type { Call, CallFrequency } from "../../types";
import * as callsApi from "../../api/calls";
import { CallModal } from "../CallModal";
import { ConfirmModal } from "../ConfirmModal";
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
      {error && <p className="empty-message">Action failed: {error}</p>}

      <div className="calls-panel__toolbar">
        <button
          className="readme-heading__add-btn calls-panel__add-btn"
          onClick={() => setModalState({ mode: "add" })}
          aria-label="Add call"
          title="Add call"
        >
          <span style={{ marginRight: "6px" }}>+</span> Add Call
        </button>
      </div>

      {calls.length === 0 ? (
        <p className="empty-message">
          No calls yet — add one! A call is someone you must ring biweekly
          (twice a month) or monthly.
        </p>
      ) : (
        SECTIONS.map(({ frequency, title }) => {
          const sectionCalls = calls.filter((c) => c.frequency === frequency);
          return (
            <section
              key={frequency}
              className={`calls-panel__section calls-panel__section--${frequency}`}
            >
              <h3 className="calls-panel__section-title">{title}</h3>
              <ul className="calls-panel__list">
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
                        <svg
                          viewBox="0 0 16 16"
                          className="calls-panel__check-icon"
                        >
                          <path
                            fillRule="evenodd"
                            d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`calls-panel__name${call.done ? " calls-panel__name--done" : ""}`}
                    >
                      {call.name}
                    </span>
                    <div className="calls-panel__actions">
                      <button
                        className="readme-heading__add-btn"
                        onClick={() => setModalState({ mode: "edit", call })}
                        aria-label={`Edit call ${call.name}`}
                        title="Edit call"
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
                        onClick={() => setDeleteTarget(call)}
                        aria-label={`Delete call ${call.name}`}
                        title="Delete call"
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
              {sectionCalls.length === 0 && (
                <p className="empty-message">No {frequency} calls.</p>
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
