# UI Shell & Design System E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the **app shell and shared design-system behaviour** introduced by the UI revamp: the grouped sidebar navigation and page headers, the colour-theme switch, due-date flags and hover-revealed actions on task rows, the shared `Modal` dialog behaviour, the dismissible action error, the By Date section labels and header tags, and the phone layout. Feature flows (creating tasks, goals, projects…) are covered by their own specs; this file covers what the redesign added around them.

## Test File Location

`e2e/ui.spec.ts`

## Purpose

These tests pin down the interaction contract of the new UI from a user's perspective — where things are, what state they show, and how dialogs behave — so later visual changes cannot silently break navigation, accessibility (named dialogs, focus return, status in words) or the responsive layout.

Some tests depend on the real system date (`dateKey(offset)`), so they can be date-boundary sensitive — do not hardcode dates. The action-error test mocks the network (`page.route` on `PUT /tasks/*`); the rest hit the real backend.

---

## Test Categories

### 1. UI - App shell (6 tests)

#### Test: "should show the brand and every view in the sidebar, in order"

- **Description**: The sidebar carries the `h1` brand and one nav item per view, grouped under labelled sections
- **Steps**: Load the app; read the `.app-nav__label` and `.app-nav__group-label` texts inside the "Views" navigation
- **Expected Output**: Labels are Tasks, By date, Insights, Projects, Goals, Events, Life events, Calls, Affirmations, Vacation, On-call; group labels are Plan, Life, Time off

#### Test: "should open on Tasks, marked current and titled"

- **Description**: The todo list is the home view
- **Steps**: Load the app
- **Expected Output**: `.tasks-nav-btn` has `aria-current="page"`; the page header title reads "Tasks"

#### Test: "should retitle the page for a panel and return to Tasks on a second click"

- **Description**: Panel nav items keep the toggle contract — clicking the open panel's item returns to the todo
- **Steps**: Click `.goals-toggle-btn` twice
- **Expected Output**: After the first click the title is "Goals", the item has `app-nav__item--current`, Tasks loses `aria-current`; after the second the title is "Tasks" and Goals is no longer current

#### Test: "should go back to the task list from a panel via Tasks"

- **Description**: The explicit Tasks item closes any open panel
- **Steps**: Open Calls, click `.tasks-nav-btn`
- **Expected Output**: `.calls-panel` hidden, title "Tasks", Calls `aria-pressed="false"`

#### Test: "should open the todo grouped by date when By date is clicked from a panel"

- **Description**: From a panel, By date navigates (rather than silently toggling a hidden filter)
- **Steps**: Open Goals, click `.bydate-toggle-btn`
- **Expected Output**: `.goals-panel` hidden, title "By date", By date `aria-pressed="true"` and marked current

#### Test: "should count open and due tasks in the sidebar"

- **Description**: Sidebar badges summarise the todo
- **Steps**: Seed tasks due today, two days ago, in three days, and one done task; reload
- **Expected Output**: Tasks badge "3" (open), By date badge "2" (due today or late); page description contains "3 open · 2 due"

### 2. UI - Theme (1 test)

#### Test: "should cycle system → light → dark and remember the choice"

- **Description**: The sidebar theme button pins or releases the colour scheme
- **Steps**: Click the "Colour theme" button through its states, reloading while on Dark
- **Expected Output**: Label goes System → Light → Dark → System; `html[data-theme]` is absent / `light` / `dark` / absent; the body background differs between light and dark; Dark survives a reload

### 3. UI - Task rows (5 tests)

#### Test: "should flag overdue and due-today dates in words, not just colour"

- **Description**: Date chips carry their urgency as text as well as colour
- **Steps**: Seed tasks dated two days ago, today, and in three days
- **Expected Output**: The late chip has `task-card__ecd--overdue` and contains "Overdue"; today's has `--today` and contains "Today"; the future chip has neither class and no `.task-card__ecd-flag`

#### Test: "should drop the overdue flag once the task is done"

- **Description**: Done tasks carry no urgency
- **Steps**: Seed an overdue task, tick it done
- **Expected Output**: Row has `task-card--done`; chip loses `--overdue` and the "Overdue" word

#### Test: "should keep row actions quiet until the row is hovered"

- **Description**: Secondary actions are revealed on hover on pointer devices
- **Steps**: Move the mouse away, then hover the row
- **Expected Output**: `.task-card__actions` opacity goes from 0 to 1

#### Test: "should keep the heading text exact, with the open count beside it"

- **Description**: The count sits outside the `h2`, so heading text stays the header name
- **Steps**: Seed "Work" with one open and one done task
- **Expected Output**: `.readme-heading__text` is exactly "Work"; `.readme-heading__count` is "1"

#### Test: "should open the add-task dialog from an empty header's row"

- **Description**: The empty-section row is itself an "add task" affordance
- **Steps**: Seed an empty "Work" header; click the "No tasks yet — add one!" button
- **Expected Output**: The add-task dialog opens with "Work" in its title

### 4. UI - Dialogs (5 tests)

#### Test: "should expose modals as named dialogs"

- **Description**: The shared `Modal` gives every dialog `role="dialog"` and an accessible name
- **Steps**: Click "Add header"
- **Expected Output**: `getByRole("dialog", { name: "Add Header" })` is visible

#### Test: "should close on Escape even when focus is outside the fields"

- **Description**: Escape works from anywhere in the dialog, not only a focused input
- **Steps**: Open the add-task dialog, click its title (focus leaves the name input), press Escape
- **Expected Output**: The dialog closes

#### Test: "should return focus to the control that opened it"

- **Description**: Keyboard users land back where they were
- **Steps**: Click "Add header", press Escape in the name field
- **Expected Output**: The "Add header" button is focused

#### Test: "should stay open when a drag starts inside and ends on the overlay"

- **Description**: Selecting text and releasing outside the dialog must not dismiss it
- **Steps**: Mouse down in the header name input, move to the top-left corner, release
- **Expected Output**: The dialog is still open

#### Test: "should start a reason-less delete confirmation on Cancel"

- **Description**: A destructive dialog focuses the safe choice
- **Steps**: Click "Delete header" on a header
- **Expected Output**: `.confirm-modal__btn--cancel` is focused

### 5. UI - Action errors (1 test)

#### Test: "should show a dismissible error when an action fails"

- **Description**: The `Action failed: …` alert is announced and can be dismissed
- **Steps**: Mock `PUT /tasks/*` to return `500 { error: "Server exploded" }`; toggle a task done; click "Dismiss error"
- **Expected Output**: `.app-action-error` is visible with `role="alert"` and "Action failed: Server exploded"; it disappears after dismissing

### 6. UI - By date (2 tests)

#### Test: "should label the sections and tag each task with its header"

- **Description**: By Date names its present/past/future sections and shows where each task lives
- **Steps**: Seed tasks today and yesterday under "Work" and in two days under "Home"; open By date
- **Expected Output**: `.bydate-section-label` texts are Today, Overdue, Upcoming; the header tags read "Work" and "Home"

#### Test: "should not tag tasks with their header in the normal list"

- **Description**: The header tag is By Date only (in the list the section already says it)
- **Steps**: Seed a task; stay on the list
- **Expected Output**: No `.task-card__header-tag` on the row

### 7. UI - Phone layout (2 tests)

#### Test: "should turn the sidebar into a scrolling top bar without page overflow"

- **Description**: At 390px the sidebar becomes a top bar with a sideways-scrolling nav
- **Steps**: Load at 390×844; inspect the nav; click the last (off-screen) item
- **Expected Output**: Brand visible; `.app-nav` is `flex-direction: row`; group labels hidden; no horizontal page overflow; clicking On-call opens it (title "On-call")

#### Test: "should open dialogs as a bottom sheet"

- **Description**: Dialogs dock to the bottom edge on phones
- **Steps**: Click "Add header" at 390×844
- **Expected Output**: The dialog is 390px wide and its bottom edge is at 844px

---

### Helper Functions Used

- `cleanDatabase()` — removes all headers/tasks before each test
- `createHeader(name)` / `createTask({...})` — API-level data setup (`done: true` supported)
- `getTask(page, name)` / `toggleTaskDone(page, name)` — task row lookup and checkbox click
- `dateKey(offset)` — YYYY-MM-DD relative to the real system date
- `waitForPageLoad(page)` — waits for the brand `h1` and for "Loading…" to clear

## Technology Stack

- **Playwright** for browser automation, run serially (`workers: 1`) against the real backend and database on port 3002 (one test mocks `PUT /tasks/*`)

## Summary

22 tests total: 6 app-shell tests (sidebar order and groups, home view, panel retitling and toggle-back, Tasks navigation, By date from a panel, sidebar counts), 1 theme test, 5 task-row tests (overdue/today flags, done drops the flag, hover-revealed actions, exact heading text with count, empty-row add), 5 dialog tests (named dialog, Escape from anywhere, focus return, drag-safe overlay, Cancel focus on delete), 1 action-error test, 2 By Date tests (section labels and header tags, no tags in the list) and 2 phone-layout tests (scrolling top bar, bottom-sheet dialogs).
