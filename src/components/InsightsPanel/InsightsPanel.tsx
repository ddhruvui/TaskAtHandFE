import { useState, useEffect, useCallback } from "react";
import type { Insight, InsightStats } from "../../types";
import * as insightsApi from "../../api/insights";
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

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statsData = await insightsApi.getStats();
      setStats(statsData);
    } catch (err) {
      setError((err as Error).message);
    }
    try {
      const latest = await insightsApi.getLatest();
      setInsight(latest);
    } catch {
      // No report yet is a normal state, not an error
      setInsight(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

  return (
    <div className="insights-panel">
      {error && <p className="empty-message">Insights error: {error}</p>}

      {/* ── Habit stats ── */}
      <section className="readme-section">
        <div className="readme-heading">
          <h2 className="readme-heading__text">Habits</h2>
        </div>
        {stats && stats.habits.length > 0 ? (
          <div className="insights-habit-grid">
            {stats.habits.map((h) => (
              <div key={`${h.taskName}-${h.headerName}`} className="insights-habit-card">
                <div className="insights-habit-card__title">
                  {h.taskName}
                  <span className="insights-habit-card__header">
                    {h.headerName ?? ""}
                  </span>
                </div>
                <div className="insights-habit-card__rate">
                  {h.completionRate}%
                  <span className="insights-habit-card__detail">
                    {h.completed}/{h.scheduled} · streak {h.currentStreak} (best{" "}
                    {h.longestStreak})
                  </span>
                </div>
                <div
                  className="insights-habit-card__dots"
                  title="Recent scheduled days, oldest → newest"
                >
                  {h.recentResults.map((r) => (
                    <span
                      key={r.dueDate}
                      className={`insights-dot ${r.completed ? "insights-dot--hit" : "insights-dot--miss"}`}
                      title={`${r.dueDate}: ${r.completed ? "done" : "missed"}`}
                    />
                  ))}
                </div>
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
      <section className="readme-section">
        <div className="readme-heading">
          <h2 className="readme-heading__text">Tasks</h2>
        </div>
        {hasArchiveData && stats ? (
          <div className="insights-task-stats">
            <p>
              <strong>{stats.oneTimeTasks.completedCount}</strong> one-time
              tasks completed in the last {stats.periodDays} days
              {stats.oneTimeTasks.avgSlippageDays !== null && (
                <>
                  {" "}
                  · average slip of{" "}
                  <strong>{stats.oneTimeTasks.avgSlippageDays} days</strong>{" "}
                  past the planned date
                </>
              )}
            </p>
            {stats.reschedules.length > 0 && (
              <>
                <p className="insights-subheading">Most rescheduled:</p>
                <ul>
                  {stats.reschedules.slice(0, 5).map((r) => (
                    <li key={`${r.taskName}-${r.headerName}`}>
                      {r.taskName} — moved {r.total}×
                      {r.pushedLater > 0 && ` (${r.pushedLater}× pushed later)`}
                    </li>
                  ))}
                </ul>
              </>
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
      <section className="readme-section">
        <div className="readme-heading">
          <h2 className="readme-heading__text">Coach</h2>
          <button
            className="readme-heading__add-btn insights-generate-btn"
            onClick={handleGenerate}
            disabled={generating || !hasArchiveData}
            title={
              hasArchiveData
                ? "Generate a fresh AI report"
                : "No archive data to analyze yet"
            }
          >
            {generating ? "Generating…" : "Generate now"}
          </button>
        </div>

        {report ? (
          <div className="insights-report">
            <p className="insights-report__meta">
              Generated {new Date(insight!.generatedAt).toLocaleString()}
            </p>
            <p className="insights-report__summary">{report.summary}</p>

            {report.habitsOnTrack.length > 0 && (
              <ReportList title="On track" items={report.habitsOnTrack} tone="good" />
            )}
            {report.habitsSlipping.length > 0 && (
              <ReportList title="Slipping" items={report.habitsSlipping} tone="bad" />
            )}
            {report.taskInsights.length > 0 && (
              <ReportList title="Tasks" items={report.taskInsights} />
            )}
            {report.procrastinationFlags.length > 0 && (
              <ReportList
                title="Procrastination flags"
                items={report.procrastinationFlags}
                tone="bad"
              />
            )}
            {report.suggestions.length > 0 && (
              <ReportList title="Suggestions" items={report.suggestions} tone="good" />
            )}
          </div>
        ) : (
          <p className="empty-message">
            No AI report yet — one is generated automatically each night, or
            click "Generate now".
          </p>
        )}
      </section>
    </div>
  );
}

function ReportList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "good" | "bad";
}) {
  return (
    <div className={`insights-report__block insights-report__block--${tone ?? "neutral"}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
