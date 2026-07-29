# View Modes E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the **By Date** view mode in the Task At Hand application — undone tasks grouped by calendar date, ordered today first, then past dates, then future dates, with thick dividers between the present, past and future sections — and for **panel-toggle exclusivity**: activating one panel toggle (Insights, Events, Life Events, Goals, Projects, Affirmations, Calls) deactivates the others, while By Date remains an independent todo-list filter.

## Test File Location

`e2e/viewmodes.spec.ts`

## Purpose

These tests verify that toggling the By Date mode regroups the task list correctly from a user's perspective: the button reflects its pressed state, groups are ordered today → past → future (each section internally ascending), the present/past/future sections are separated by thick dividers, done tasks are excluded, and undated tasks collect in a trailing "No date" group.

Several tests depend on the real system date (tasks are created relative to today via `dateKey(offset)`), so they can be date-boundary sensitive — do not hardcode dates.

---

## Test Categories

### 1. View Modes - By Date (8 tests)

These tests verify the By Date toggle, which regroups undone tasks under date headings ordered today first, then past, then future.

#### Test: "should toggle by date button pressed state"

- **Description**: Checks the By Date button's accessibility state and active styling as it is toggled
- **Steps**: Click the `.bydate-toggle-btn` twice, observing state between clicks
- **Expected Output**:
  - `aria-pressed` starts `"false"`, becomes `"true"` after the first click (with the `bydate-toggle-btn--active` class), and returns to `"false"` after the second

#### Test: "should order groups as today first, then past, then future"

- **Description**: Checks that today's group comes first, followed by past dates (oldest first), followed by future dates
- **Steps**: Create tasks dated two days from now, three days ago, five days ago, and today; reload; enable By Date
- **Expected Output**:
  - Group headings read today's formatted date, then five days ago, then three days ago, then two days from now (via `formatDateKey`)
  - The today task appears inside today's group

#### Test: "should divide present, past and future with thick dividers"

- **Description**: Verifies the thick divider rule between the present, past and future sections
- **Steps**: Create tasks dated today, three days ago, and two days from now; reload; enable By Date
- **Expected Output**: Exactly two `.bydate-divider` elements (one between present and past, one between past and future)

#### Test: "should not render dividers when only one section has tasks"

- **Description**: Confirms dividers only appear between populated sections
- **Steps**: Create a single future-dated task; reload; enable By Date
- **Expected Output**: The future task is visible and no `.bydate-divider` elements are rendered

#### Test: "should show undated tasks under a No date group last"

- **Description**: Verifies undated tasks collect in a "No date" group after all dated groups
- **Steps**: Create an undated task and a task dated today; reload; enable By Date
- **Expected Output**: Headings are today's date then "No date", and the undated task is inside the "No date" group

#### Test: "should exclude done tasks from the by date view"

- **Description**: Confirms completed tasks never appear in the By Date view
- **Steps**: Create a done task and an open task, both dated today; reload; enable By Date
- **Expected Output**: The open task is visible; the done task is not

#### Test: "should group recurring tasks due today under today's date"

- **Description**: Verifies recurring tasks surface under today's group when due today, and are hidden otherwise (they have no single calendar date)
- **Steps**: Create a weekly task on today's weekday and one on another weekday; reload; enable By Date
- **Expected Output**: The weekly-today task appears in today's group; the other-day weekly task is not visible

#### Test: "should show empty state when there are no dated tasks"

- **Description**: Checks the empty-state message with no data
- **Steps**: Enable By Date on an empty database
- **Expected Output**: The text "No dated tasks to show." is displayed

### 2. View Modes - Panel switching (2 tests)

These tests verify that the panel toggles are mutually exclusive — clicking one always shows that panel and deactivates whichever panel was open — while By Date stays independent.

#### Test: "should open the clicked panel and deactivate the previous one"

- **Description**: Regression test for the panel priority chain: Events renders before Life Events, so without exclusivity the Events panel kept showing while the Life Events button read as active
- **Steps**: Click the Events toggle, then the Life Events toggle
- **Expected Output**:
  - After the first click the `.events-panel` is visible
  - After the second click the `.lifeevents-panel` is visible, the `.events-panel` is not, the Life Events button is pressed (`aria-pressed="true"`, active class) and the Events button is unpressed
  - The active Life Events button's computed background differs from the inactive Events button's — the active class must carry real styling (its `--active` CSS rule was once missing, so the button never visually highlighted)

#### Test: "should keep by date mode active across panel toggling"

- **Description**: Confirms By Date is a todo-list filter, not a panel — opening and closing a panel leaves it active
- **Steps**: Enable By Date, open the Life Events panel, then close it by clicking its toggle again
- **Expected Output**: By Date stays pressed throughout, and after the panel closes the By Date view is showing again (empty-state text on a clean database)

---

## Test Setup

### Before Each Test

- `cleanDatabase()` removes every header (and its tasks) via the API
- The page is loaded and `waitForPageLoad(page)` waits for the app to render

### Helper Functions Used

- `createHeader(name)` / `createTask({...})` — API-level data setup
- `getTask(page, name)` — locates a task card by name
- `dateKey(offset)` — YYYY-MM-DD key relative to the real system date (negative offsets give past dates)
- `formatDateKey(key)` — the app's own date-heading formatter (imported from `src/utils/ecd`), keeping heading assertions in sync with the UI

## Technology Stack

- **Playwright** for browser automation, run serially (`workers: 1`) against the real backend and database on port 3002

## Summary

10 tests total: 8 By Date tests covering toggle state, today→past→future group ordering, present/past/future dividers, date grouping (one-time and recurring), done-task exclusion, the trailing "No date" group, and the empty state; plus 2 panel-switching tests covering mutual exclusivity of the panel toggles and By Date's independence from them.
