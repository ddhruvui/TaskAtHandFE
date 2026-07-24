# Projects E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Projects functionality in the Task At Hand application. A project is a long-term effort (like "Automated Stock Market") broken into ordered tasks/steps ("get data from EODHD", "get data from Nasdaq", "deploy to cpu"). Projects are ordered by a header-style priority, and inside each project undone tasks always sit above done tasks (the done/undone barrier from the todo). Giving a task a **date** mirrors it into the todo as a one-time date task under a header named after the project (reused case-insensitively, created otherwise). The sync works both ways: toggling done on either side flips the other, deleting the todo task unlinks the project task, and when the nightly cron deletes the completed todo task the project task is marked done and retained in the project as a completed step.

## Test File Location

`e2e/projects.spec.ts`

## Purpose

These tests verify that users can create, reorder and delete projects; add, edit, reorder, complete and delete project tasks with the same interactions as the todo; that dated tasks are mirrored into (and cleaned out of) the todo correctly; and that the cron completes the loop — the done todo task disappears from the todo but stays in the project as done.

---

## Test Categories

### 1. Projects - Panel (2 tests)

These tests verify the Projects view toggle and empty state.

#### Test: "should show empty state when no projects exist"

- **Description**: Checks that when there are no projects, a helpful message appears
- **Steps**: Open the Projects view with an empty database
- **Expected Output**: The text "No projects yet — add one!" is displayed to guide the user

#### Test: "should toggle projects button pressed state"

- **Description**: Verifies the Projects toolbar button toggles the view on and off
- **Steps**: Click the Projects toggle button, then click it again
- **Expected Output**:
  - After the first click `aria-pressed` is "true", the button gets the active style, and the panel is visible
  - After the second click `aria-pressed` is "false" and the panel is hidden

### 2. Projects - Create & order (3 tests)

These tests verify project creation, priority ordering and deletion.

#### Test: "should create a project via UI"

- **Description**: Verifies a user can create a project using the interface
- **Steps**: Open the Projects view, click "Add Project", enter "Automated Stock Market", submit
- **Expected Output**: A new project section titled "Automated Stock Market" appears with the "No tasks yet…" hint

#### Test: "should reorder projects with move up/down"

- **Description**: Projects carry a contiguous 0-based priority like headers; the arrows move a whole project
- **Steps**: Create "Project A" and "Project B" via API, open the Projects view, click "Move project Project B up"
- **Expected Output**: The section order flips to B, A in the UI and `GET /projects` returns them in that order

#### Test: "should delete a project and leave its todo tasks alone"

- **Description**: Deleting a project never touches the todo — mirrored tasks stay
- **Steps**: Create a header + linked todo task + project via API; delete the project via UI and confirm
- **Expected Output**: The confirm message notes "Tasks already added to the todo stay."; the panel returns to the empty state; the todo task still exists

### 3. Projects - Tasks (9 tests)

These tests verify project task CRUD, the done/undone barrier, and the two-way todo sync.

#### Test: "should add an undated task (panel only, no todo entry)"

- **Description**: A task without a date lives only in the project
- **Steps**: Add a task "deploy to cpu" via the panel's add-task modal without picking a date
- **Expected Output**: The row appears without a date chip and no header is created in the todo

#### Test: "should mirror a dated task into the todo under the project header"

- **Description**: The core flow — a dated task shows up in the todo under the project's name
- **Steps**: Add a task "get data from EODHD" via the panel and pick today in the Date calendar
- **Expected Output**:
  - The row appears with a date chip
  - A todo header named after the project is created holding one task with a `date` ECD of today
  - The project task's `todoTaskId` links to the created todo task
  - The main todo view shows the task under the project header

#### Test: "should reuse an existing header (case-insensitive) for dated tasks"

- **Description**: Same find-or-create pattern as event scheduling and goal steps
- **Steps**: Create a header "automated stock market" via API; add a dated task to project "Automated Stock Market"
- **Expected Output**: No second header is created; the existing lowercase header is reused

#### Test: "should move done tasks to the bottom when toggled in the panel"

- **Description**: The done/undone barrier applies within a project — done moves to the bottom
- **Steps**: Create a project with three undone tasks; toggle the first one done
- **Expected Output**: The toggled task drops to the bottom with done styling and the progress badge shows "1/3 done"

#### Test: "should mark the linked todo task done when toggled in the panel"

- **Description**: Panel → todo direction of the done sync
- **Steps**: Create a linked project task via API; toggle it done in the panel
- **Expected Output**: The project row shows done styling and the todo task's `done` becomes true

#### Test: "should mark the project task done when its todo task is toggled in the todo"

- **Description**: Todo → project direction of the done sync
- **Steps**: Create a linked project task via API; toggle the todo task's checkbox in the todo view; wait for the sync to land; open the Projects view
- **Expected Output**: The project task shows done styling and is re-sorted below the undone task

#### Test: "should reorder tasks with move up/down but not across the done barrier"

- **Description**: Task priority moves mirror the todo's rules — never across the barrier
- **Steps**: Create a project with two undone tasks and one done task; move the second undone task up
- **Expected Output**: The undone tasks swap; the last undone task's "down" and the done task's "up" arrows are disabled

#### Test: "should delete the linked todo task when the project task is deleted"

- **Description**: Deleting a linked project task cleans up its todo entry too
- **Steps**: Create a linked project task via API; delete it in the panel and confirm
- **Expected Output**: The confirm message warns "Its todo entry is removed too."; the row disappears and the header's task list is empty

#### Test: "should unlink the project task when its todo task is deleted from the todo"

- **Description**: Todo-side deletions flow back — the project task loses its link and date but stays undone
- **Steps**: Create a linked project task via API; delete the todo task from the todo view (with a reason)
- **Expected Output**: `GET /projects` shows the task with `date: null`, `done: false`, `todoTaskId: null`

### 4. Projects - Todo edit & order sync (4 tests)

These tests verify that todo-side edits and reorders flow back into the project, and that project reorders flow into the todo.

#### Test: "should update the project task date when the linked todo task's date is edited"

- **Description**: Changing the todo task's date changes the project task's date
- **Steps**: Create a linked project task dated today via API; in the todo view edit the task's date to the 1st of the current month (an earlier day, so no postpone-reason flow); save (skipped when today **is** the 1st)
- **Expected Output**: The project task's `date` becomes the 1st of the month and `todoTaskId` is unchanged

#### Test: "should clear the project task date when the todo task's date is removed"

- **Description**: Clearing the todo task's due date (Due → None) sets the project task's date to none
- **Steps**: Create a linked project task via API; in the todo view edit the task, select the "None" due mode, save
- **Expected Output**: The project task's `date` becomes `null` while `todoTaskId` is kept (only the date is gone)

#### Test: "should mirror a project task reorder into the todo"

- **Description**: Moving a task within a project also reorders the linked todo tasks
- **Steps**: Create a header with two dated, linked todo tasks and their project via API; in the Projects panel move the second task up
- **Expected Output**: The project shows the new order and `GET /tasks` returns the todo tasks in the same swapped order

#### Test: "should mirror a todo reorder of linked tasks into the project"

- **Description**: Moving a linked task in the todo also reorders the project's task list
- **Steps**: Same setup; in the todo view move the second task up with the task card's arrow
- **Expected Output**: `GET /projects` returns the project tasks in the swapped order

### 5. Projects - Cron completion (1 test)

#### Test: "done dated task leaves the todo but is retained as done in the project"

- **Description**: The full lifecycle — once the todo task is done and the nightly cron runs, it is deleted from the todo but kept in the project as a completed step
- **Steps**: Create a linked, **done** todo task (dated yesterday) and its project via API; trigger `POST /cron/run`; reload and open the Projects view
- **Expected Output**:
  - The cron stats report `projectTasksCompleted: 1`
  - The todo header has no tasks left
  - The project task is `done: true` with its date kept and `todoTaskId` cleared, sorted to the bottom
  - The panel shows the row with done styling and the badge "1/2 done"

---

## Summary

Total: **19 tests** across 5 categories, covering the Projects panel toggle, project CRUD and priority ordering, task CRUD with the done/undone barrier, the two-way todo sync for dated tasks (done state, date edits and reordering), and the cron completion flow.
