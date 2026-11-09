import { useState, useEffect, useCallback } from "react";
import type { OnCallShift } from "../../types";
import * as onCallApi from "../../api/oncall";
import { OnCallModal } from "../OnCallModal";
import type { OnCallDraft } from "../OnCallModal";
import { AddButton } from "../AddButton";
import { ConfirmModal } from "../ConfirmModal";
import { Icon } from "../Icon";
import { formatDateKey } from "../../utils/ecd";
import {
  dateKeyOf,
  formatDuration,
  formatMoment,
  formatSpan,
  isActive,
  isOvernight,
  onCallAgenda,
  shiftMinutes,
} from "../../utils/oncall";
import "./OnCallPanel.css";

interface OnCallPanelProps {
  /** Called after any change, so the app-wide "on call now" banner refreshes. */
  onShiftsChanged: () => void | Promise<void>;
}

/**
 * On-call view: one agenda of upcoming shifts with the off-call gaps between
 * them — "Not on call from Mon 11/16 22:00 to Tue 11/24 09:00" — instead of
 * paging through weeks (`onCallAgenda` in utils/oncall). Back-to-back or
 * overlapping shifts are one stretch of cover, with no gap inside; when the
 * user isn't on call right now the agenda opens with "Not on call now".
 *
 * On-call is a record kept apart from the todo — nothing here touches tasks.
 * Primary shifts are solid bars in the On-call hue, secondary ones a tinted,
 * dashed outline in the same family — they differ by shape, not just colour.
 * Ended shifts are hidden on the local clock the moment they end; the backend
 * cron deletes them overnight.
 */
export default function OnCallPanel({ onShiftsChanged }: OnCallPanelProps) {
  const [shifts, setShifts] = useState<OnCallShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [modalState, setModalState] = useState<{
    mode: "add" | "edit";
    shift?: OnCallShift;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnCallShift | null>(null);

  const load = useCallback(async () => {
    setShifts(await onCallApi.getAll());
  }, []);

  useEffect(() => {
    onCallApi.getAll().then(
      (all) => {
        setShifts(all);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  // A shift drops off the list the minute it ends, and "now" gaps shrink.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── CRUD (no optimistic updates: mutate via API, then refetch) ── */

  const handleSave = async (draft: OnCallDraft) => {
    if (!modalState) return;
    try {
      if (modalState.mode === "add") {
        await onCallApi.create(draft);
      } else {
        await onCallApi.update(modalState.shift!._id, draft);
      }
      await load();
      setModalState(null);
      setError(null);
      await onShiftsChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onCallApi.remove(deleteTarget._id);
      await load();
      setDeleteTarget(null);
      setError(null);
      await onShiftsChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="oncall-panel">
        <p className="empty-message">Loading on-call shifts…</p>
      </div>
    );
  }

  const today = dateKeyOf(now);
  const { items, freeAfter } = onCallAgenda(shifts, now);
  const shiftItems = items.filter((i) => i.kind === "shift");
  const totalMinutes = shiftItems.reduce(
    (sum, i) => sum + shiftMinutes(i.shift),
    0,
  );

  return (
    <div className="oncall-panel">
      {error && (
        <div className="alert alert--danger oncall-panel__error" role="alert">
          <Icon name="alert" />
          <span>Action failed: {error}</span>
        </div>
      )}

      {/* The view's "+", lifted into the page header (top right) */}
      <div className="oncall-panel__toolbar page-actions">
        <AddButton
          ariaLabel="Add on-call shift"
          onClick={() => setModalState({ mode: "add" })}
        />
      </div>

      <section className="readme-section oncall-panel__upcoming">
        <div className="readme-heading">
          <div className="readme-heading__title">
            <h2 className="readme-heading__text">Upcoming</h2>
            {shiftItems.length > 0 && (
              <span className="readme-heading__count">{shiftItems.length}</span>
            )}
          </div>
          {shiftItems.length > 0 && (
            <span className="oncall-panel__totals">
              {formatDuration(totalMinutes)} on call
            </span>
          )}
        </div>
        {shiftItems.length === 0 ? (
          <p className="empty-message">
            No upcoming on-call shifts — add one! Type the shorthand you already
            use, like 11/16 9-22. On-call is kept separate and never changes
            your tasks.
          </p>
        ) : (
          <ol className="oncall-panel__list" aria-label="On-call agenda">
            {items.map((item) => {
              if (item.kind === "gap") {
                return (
                  <li
                    key={`gap-${item.from.getTime()}`}
                    className={`oncall-panel__gap${item.fromNow ? " oncall-panel__gap--now" : ""}`}
                  >
                    <div className="oncall-panel__main">
                      <span className="oncall-panel__gap-title">
                        Not on call{item.fromNow ? " now" : ""}
                      </span>
                      <span className="oncall-panel__meta oncall-panel__gap-range">
                        {item.fromNow
                          ? `until ${formatMoment(item.to, now)}`
                          : `from ${formatMoment(item.from, now)} to ${formatMoment(item.to, now)}`}
                      </span>
                    </div>
                    <span
                      className={`chip oncall-panel__gap-span${item.fromNow ? " chip--success" : ""}`}
                      title={`${formatSpan(item.minutes)} without on-call cover`}
                    >
                      {formatSpan(item.minutes)}
                    </span>
                  </li>
                );
              }
              const { shift } = item;
              const active = isActive(shift, now);
              return (
                <li
                  key={shift._id}
                  className={`oncall-panel__row oncall-panel__row--${shift.type}${active ? " oncall-panel__row--active" : ""}`}
                >
                  <div className="oncall-panel__main">
                    <div className="oncall-panel__line">
                      <span className="oncall-panel__times">
                        {shift.start} – {shift.end}
                        {isOvernight(shift) && (
                          <span className="oncall-panel__plus1"> +1</span>
                        )}
                      </span>
                      {shift.type === "secondary" && (
                        <span className="chip oncall-panel__pill oncall-panel__pill--secondary">
                          secondary
                        </span>
                      )}
                      {active && (
                        <span className="chip chip--danger oncall-panel__pill oncall-panel__pill--now">
                          <span
                            className="oncall-panel__live-dot"
                            aria-hidden="true"
                          />
                          now
                        </span>
                      )}
                    </div>
                    <span className="oncall-panel__meta">
                      {shift.date === today ? "Today · " : ""}
                      {formatDateKey(shift.date)} ·{" "}
                      {formatDuration(shiftMinutes(shift))}
                      {shift.note ? ` · ${shift.note}` : ""}
                    </span>
                  </div>
                  <div className="oncall-panel__actions">
                    <button
                      className="icon-btn oncall-panel__icon-btn"
                      onClick={() => setModalState({ mode: "edit", shift })}
                      aria-label={`Edit on-call shift ${shift.date} ${shift.start}`}
                      title="Edit"
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                    <button
                      className="icon-btn icon-btn--danger oncall-panel__icon-btn oncall-panel__icon-btn--danger"
                      onClick={() => setDeleteTarget(shift)}
                      aria-label={`Delete on-call shift ${shift.date} ${shift.start}`}
                      title="Delete"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
            {freeAfter && (
              <li className="oncall-panel__end">
                Nothing scheduled after {formatMoment(freeAfter, now)}
              </li>
            )}
          </ol>
        )}
      </section>

      {modalState && (
        <OnCallModal
          shift={modalState.shift}
          onConfirm={handleSave}
          onCancel={() => setModalState(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete the ${deleteTarget.type} on-call shift on ${formatDateKey(deleteTarget.date)} (${deleteTarget.start}–${deleteTarget.end})?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
