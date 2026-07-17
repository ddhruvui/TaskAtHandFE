# Insights E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Insights functionality in the Task At Hand application. The Insights view shows exact habit/task stats computed from the backend's TaskArchive, plus the latest AI coaching report (summary, habits on track/slipping, task insights, procrastination flags, calls to make, suggestions) with an on-demand "Generate now" button.

Unlike the other e2e suites, these tests do not exercise the real insights endpoints: the archive is written by the nightly cron and cannot be seeded through the public API. Every `/insights*` request is mocked at the network layer with `page.route`, so each state (empty, rich, error, report/no report) is deterministic.

## Test File Location

`e2e/insights.spec.ts`

## Purpose

These tests verify that users can open the Insights view, see habit and task stats rendered from the archive, read the latest AI report (including the calls-to-make section for reports that have it), generate a fresh report on demand, and get sensible empty and error states.

---

## Test Categories

### 1. Insights - Panel (4 tests)

These tests verify the Insights view toggle, its section headings, view precedence, and error handling.

#### Test: "should show the insights sections when toggled"

- **Description**: Checks that toggling the Insights view renders its three sections and marks the toolbar button active
- **Steps**: Mock empty stats and no report; click the Insights toggle button
- **Expected Output**: The "Habits", "Tasks", and "Coach" headings are visible; the toggle button has `aria-pressed="true"` and the active style

#### Test: "should return to the todo view when toggled off"

- **Description**: Verifies toggling Insights off restores the normal todo view
- **Steps**: Open the Insights view, then click the toggle button again
- **Expected Output**: The insights panel is hidden and the todo empty state ("No headers yet — add one!") is visible

#### Test: "should take precedence over the events view"

- **Description**: Confirms the Insights view replaces the Events view when both are toggled
- **Steps**: Open the Events view, then open the Insights view
- **Expected Output**: The events panel is hidden and the insights panel is visible

#### Test: "should show an error when the stats endpoint fails"

- **Description**: Verifies a failed stats fetch surfaces an inline error message
- **Steps**: Mock `/insights/stats` to return a 500 with error "boom"; open the Insights view
- **Expected Output**: The text "Insights error: boom" is displayed

### 2. Insights - Empty states (2 tests)

These tests verify behavior when the archive has no data yet.

#### Test: "should show empty states when there is no archive data"

- **Description**: Checks each section's empty message with an empty archive and no stored report
- **Steps**: Mock empty stats (eventCount 0) and a 404 for the latest report; open the Insights view
- **Expected Output**: "No habit history yet.", "No task history yet — completed tasks are archived", and "No AI report yet" messages are all visible

#### Test: "should disable Generate now when there is no archive data"

- **Description**: Verifies report generation is blocked without archive data
- **Steps**: Mock empty stats; open the Insights view; inspect the "Generate now" button
- **Expected Output**: The button is disabled with the title "No archive data to analyze yet"

### 3. Insights - Stats display (2 tests)

These tests verify the exact-stats sections render the mocked archive data.

#### Test: "should render habit cards from stats"

- **Description**: Checks a habit card shows the name, header, completion rate, streaks, and the recent hit/miss dot row
- **Steps**: Mock rich stats containing one habit ("Morning run", 6/8, 75%, streak 2, best 4, one hit + one miss in recentResults); open the Insights view
- **Expected Output**: The card shows "Morning run", "Health", "75%", "6/8 · streak 2 (best 4)", and exactly two dots — one hit, one miss

#### Test: "should render task stats and the most rescheduled list"

- **Description**: Checks the one-time task rollup and the most-rescheduled list
- **Steps**: Mock rich stats (5 completed one-time tasks, avg slip 1.5 days, "File taxes" moved 3× with 2 pushed later); open the Insights view
- **Expected Output**: The task stats show "5 one-time tasks completed in the last 28 days", "average slip of 1.5 days past the planned date", "Most rescheduled:", and "File taxes — moved 3× (2× pushed later)"

### 4. Insights - Coach report (4 tests)

These tests verify the AI report rendering, including the calls-to-make section and on-demand generation.

#### Test: "should render the latest AI report"

- **Description**: Checks the stored report renders its summary and each non-empty section as a titled list
- **Steps**: Mock rich stats and a stored report with all sections populated; open the Insights view
- **Expected Output**: The summary text and the "On track", "Slipping", "Procrastination flags", and "Suggestions" headings are visible, with their items (e.g. "Block a weekend morning for taxes")

#### Test: "should render call reminders when the report includes them"

- **Description**: Verifies reports generated after the Calls feature show the "Calls to make" section with its reminder lines
- **Steps**: Mock a stored report whose `callReminders` contains two reminders (Grandma not yet called this period; Uncle Raj missed two months running); open the Insights view
- **Expected Output**: The "Calls to make" heading and both reminder lines are visible

#### Test: "should hide the calls section for reports without callReminders"

- **Description**: Verifies backward compatibility — reports stored before the Calls feature have no `callReminders` field and must render without a calls section
- **Steps**: Mock a stored report without a `callReminders` field; open the Insights view
- **Expected Output**: The report renders normally (summary visible) and the "Calls to make" heading is not present

#### Test: "should generate a fresh report on demand"

- **Description**: Verifies the "Generate now" flow replaces the empty state with the generated report
- **Steps**: Mock rich stats, no stored report, and a successful `/insights/generate` response; open the Insights view; click "Generate now"
- **Expected Output**: "No AI report yet" is shown before the click and disappears after; the generated report's summary is visible

---

## Summary

| Category                  | Tests  |
| ------------------------- | ------ |
| Insights - Panel          | 4      |
| Insights - Empty states   | 2      |
| Insights - Stats display  | 2      |
| Insights - Coach report   | 4      |
| **Total**                 | **12** |
