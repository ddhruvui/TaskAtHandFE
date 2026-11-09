import { useState, useEffect } from "react";
import type { Insight, InsightStats } from "../../types";
import * as insightsApi from "../../api/insights";
import { Icon, type IconName } from "../Icon";
import "./InsightsPanel.css";

/**
 * Insights view: exact habit/task stats from the archive, plus the latest
 * AI coaching report with an on-demand "Generate now" button.
 */
export function InsightsPanel() {
  const [stats, setStats] = useState<InsightStats | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial load (loading/error already start true/null): stats first, then
    // the latest report. setState happens in the promise callbacks, not the
    // effect body (keeps react-hooks/set-state-in-effect happy).
    insightsApi
      .getStats()
      .then(setStats, (err: Error) => setError(err.message))
      .then(() => insightsApi.getLatest())
      // No report yet is a normal state, not an error
      .then(setInsight, () => setInsight(null))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fresh = await insightsApi.generate();
      setInsight(fresh);
    } catch (err) {
      setError((err as Error).message);
    }
    setGenerating(false);
  };

  if (loading) {
    return <p className="empty-message">Loading insights…</p>;
  }

  const hasArchiveData = stats !== null && stats.eventCount > 0;
  const report = insight?.report;

  const vacation = stats?.vacation;
  const onVacation = vacation?.onVacation === true;

  return (
    <div className="insights-panel">
      {error && (
        <div className="alert alert--danger insights-panel__error" role="alert">
          <Icon name="alert" />
          <span>Insights error: {error}</span>
        </div>
      )}

      {/* ── Vacation notice ──
          Without this the numbers below look broken: a frozen window explains
          why nothing moved, and excluded days explain a denominator that
          shrank. */}
      {vacation?.onVacation && (
        <div className="alert insights-vacation-note" role="status">
          <Icon name="vacation" />
          <span>
            <strong>You're on vacation.</strong> These numbers are as of{" "}
            {vacation.frozenAt ?? "before you left"} and stay put until you're
            back — days off aren't counted against you, and coach reports are
            paused. Anything you do tick off still counts and will show up when
            you return.
          </span>
        </div>
      )}
      {!vacation?.onVacation && vacation?.justReturnedFrom && (
        <div className="alert insights-vacation-note" role="status">
          <Icon name="vacation" />
          <span>
            <strong>Welcome back.</strong> You were away{" "}
            {vacation.justReturnedFrom.days} day
            {vacation.justReturnedFrom.days === 1 ? "" : "s"} — those days
            don't count as misses, and habit streaks start fresh from here.
          </span>
        </div>
      )}
      {!vacation?.onVacation &&
        vacation !== undefined &&
        vacation.vacationDaysInWindow > 0 && (
          <p className="insights-vacation-hint">
            {vacation.vacationDaysInWindow} vacation day
            {vacation.vacationDaysInWindow === 1 ? "" : "s"} in this period are
            excluded from the rates below.
          </p>
        )}

      {/* ── Habit stats ── */}
      <section className="readme-section insights-section">
        <div className="readme-heading">
          <div className="readme-heading__title">
            <h2 className="readme-heading__text">Habits</h2>
            {stats && stats.habits.length > 0 && (
              <span className="readme-heading__count">
                {stats.habits.length}
              </span>
            )}
          </div>
          {stats && (
            <span className="insights-section__period">
              Last {stats.periodDays} days
            </span>
          )}
        </div>
        {stats && stats.habits.length > 0 ? (
          <div className="insights-habit-grid">
            {stats.habits.map((h) => (
              <div
                key={`${h.taskName}-${h.headerName}`}
                className="insights-habit-card"
              >
                <div className="insights-habit-card__title">
                  <span className="insights-habit-card__name">
                    {h.taskName}
                  </span>
                  {h.headerName && (
                    <span className="insights-habit-card__header">
                      {h.headerName}
                    </span>
                  )}
                </div>
                <div className="insights-habit-card__rate">
                  <span className="insights-habit-card__pct">
                    {h.completionRate}%
                  </span>
                  <span className="insights-habit-card__detail">
                    {h.completed}/{h.scheduled} · streak {h.currentStreak} (best{" "}
                    {h.longestStreak})
                  </span>
                </div>
                <div className="insights-habit-card__meter" aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, h.completionRate))}%`,
                    }}
                  />
                </div>
                <div
                  className="insights-habit-card__dots"
                  title="Recent scheduled days, oldest → newest"
                >
                  {h.recentResults.map((r) => {
                    // Three states, not two: a vacation day the user didn't act
                    // on is neither a hit nor a miss. Drawing it as a miss would
                    // make the excluded day look like a failure; dropping it
                    // would make the streak restart look like a bug.
                    const paused = !r.completed && r.vacation;
                    return (
                      <span
                        key={r.dueDate}
                        className={`insights-dot ${r.completed ? "insights-dot--hit" : paused ? "insights-dot--paused" : "insights-dot--miss"}`}
                        title={`${r.dueDate}: ${r.completed ? "done" : paused ? "on vacation — not counted" : "missed"}`}
                      />
                    );
                  })}
                </div>
                {/* All-time count, deliberately separate from the windowed
                    figures above — it ignores the reporting period entirely. */}
                {(h.lifetimeCompleted !== undefined ||
                  (h.pausedDays !== undefined && h.pausedDays > 0)) && (
                  <div className="insights-habit-card__foot">
                    {h.lifetimeCompleted !== undefined && (
                      <span className="insights-habit-card__lifetime">
                        Done <strong>{h.lifetimeCompleted}</strong> time
                        {h.lifetimeCompleted === 1 ? "" : "s"} all-time
                      </span>
                    )}
                    {h.pausedDays !== undefined && h.pausedDays > 0 && (
                      <span className="insights-habit-card__paused">
                        {h.pausedDays} vacation day
                        {h.pausedDays === 1 ? "" : "s"} excluded
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-message">
            No habit history yet. Habits are tasks scheduled by day of week —
            results are recorded each night.
          </p>
        )}
      </section>

      {/* ── Task stats ── */}
      <section className="readme-section insights-section">
        <div className="readme-heading">
          <div className="readme-heading__title">
            <h2 className="readme-heading__text">Tasks</h2>
          </div>
        </div>
        {hasArchiveData && stats ? (
          <div className="insights-task-stats">
            {/* Each figure reads as one sentence in the DOM ("5 one-time tasks
                completed in the last 28 days") — the tile only changes how it
                is laid out. */}
            <div className="insights-stat-grid">
              <p className="insights-stat">
                <strong className="insights-stat__value">
                  {stats.oneTimeTasks.completedCount}
                </strong>{" "}
                <span className="insights-stat__label">
                  one-time tasks completed in the last {stats.periodDays} days
                </span>
              </p>
              {/* On or before the planned date is a win — shown first, and the
                  slip figure only appears when something was actually late.
                  Older backends don't send the counts, hence the guard. */}
              {stats.oneTimeTasks.onTimeCount !== undefined && (
                <p className="insights-stat insights-stat--good">
                  <strong className="insights-stat__value">
                    {stats.oneTimeTasks.onTimeCount}
                  </strong>{" "}
                  <span className="insights-stat__label">
                    on or before the planned date
                  </span>
                </p>
              )}
              {stats.oneTimeTasks.avgSlippageDays !== null &&
                stats.oneTimeTasks.avgSlippageDays > 0 && (
                  <p className="insights-stat insights-stat--warn">
                    {/* "of" is for the sentence (screen readers, copy);
                        the tile reads "1.5 days / average slip past…" */}
                    <span className="insights-stat__label insights-stat__label--lead">
                      average slip <span className="sr-only">of</span>
                    </span>{" "}
                    <strong className="insights-stat__value">
                      {stats.oneTimeTasks.avgSlippageDays} days
                    </strong>{" "}
                    <span className="insights-stat__label">
                      past the planned date
                    </span>
                  </p>
                )}
            </div>
            {stats.reschedules.length > 0 && (
              <div className="insights-resched">
                <p className="insights-subheading">Most rescheduled:</p>
                <ul className="insights-resched__list">
                  {stats.reschedules.slice(0, 5).map((r) => (
                    <li
                      key={`${r.taskName}-${r.headerName}`}
                      className="insights-resched__row"
                    >
                      <span className="insights-resched__name">
                        {r.taskName}
                      </span>
                      <span className="insights-resched__meta">
                        {" "}
                        — moved {r.total}×
                        {r.pushedLater > 0 &&
                          ` (${r.pushedLater}× pushed later)`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="empty-message">
            No task history yet — completed tasks are archived by the nightly
            job.
          </p>
        )}
      </section>

      {/* ── AI report ── */}
      <section className="readme-section insights-section">
        <div className="readme-heading">
          <div className="readme-heading__title">
            <h2 className="readme-heading__text">Coach</h2>
          </div>
          <button
            className="btn btn--secondary btn--sm insights-generate-btn"
            onClick={handleGenerate}
            disabled={generating || !hasArchiveData || onVacation}
            title={
              onVacation
                ? "Paused while you're on vacation"
                : hasArchiveData
                  ? "Generate a fresh AI report"
                  : "No archive data to analyze yet"
            }
          >
            <Icon name="sparkles" size={14} />
            {generating ? "Generating…" : "Generate now"}
          </button>
        </div>

        {report ? (
          <div className="insights-report">
            <p className="insights-report__summary">{report.summary}</p>
            <p className="insights-report__meta">
              Generated {new Date(insight!.generatedAt).toLocaleString()}
            </p>

            <div className="insights-report__blocks">
              {report.habitsOnTrack.length > 0 && (
                <ReportList
                  title="On track"
                  items={report.habitsOnTrack}
                  tone="good"
                />
              )}
              {report.habitsSlipping.length > 0 && (
                <ReportList
                  title="Slipping"
                  items={report.habitsSlipping}
                  tone="bad"
                />
              )}
              {report.taskInsights.length > 0 && (
                <ReportList
                  title="Tasks"
                  items={report.taskInsights}
                  icon="tasks"
                />
              )}
              {report.procrastinationFlags.length > 0 && (
                <ReportList
                  title="Procrastination flags"
                  items={report.procrastinationFlags}
                  tone="bad"
                  icon="clock"
                />
              )}
              {report.callReminders && report.callReminders.length > 0 && (
                <ReportList
                  title="Calls to make"
                  items={report.callReminders}
                  icon="calls"
                />
              )}
              {report.suggestions.length > 0 && (
                <ReportList
                  title="Suggestions"
                  items={report.suggestions}
                  tone="good"
                  icon="sparkles"
                />
              )}
            </div>
          </div>
        ) : (
          <p className="empty-message">
            {onVacation
              ? "Coach reports are paused while you're on vacation — the next one lands after you're back, with a plan for restarting."
              : 'No AI report yet — one is generated automatically each day, or click "Generate now".'}
          </p>
        )}
      </section>
    </div>
  );
}

const TONE_ICON: Record<"good" | "bad" | "neutral", IconName> = {
  good: "check",
  bad: "alert",
  neutral: "notes",
};

function ReportList({
  title,
  items,
  tone,
  icon,
}: {
  title: string;
  items: string[];
  tone?: "good" | "bad";
  /** Glyph beside the heading; defaults to one that matches the tone */
  icon?: IconName;
}) {
  const t = tone ?? "neutral";
  return (
    <div className={`insights-report__block insights-report__block--${t}`}>
      <h3 className="insights-report__block-title">
        <span className="insights-report__block-icon" aria-hidden="true">
          <Icon name={icon ?? TONE_ICON[t]} size={13} strokeWidth={2.4} />
        </span>
        {title}
      </h3>
      <ul className="insights-report__list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
