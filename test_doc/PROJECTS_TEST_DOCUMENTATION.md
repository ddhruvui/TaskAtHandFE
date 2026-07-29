# Projects E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Projects functionality in the Task At Hand application. A project is a long-term effort (like "Automated Stock Market") broken into ordered tasks/steps ("get data from EODHD", "get data from Nasdaq", "deploy to cpu"). Projects are ordered by a header-style priority, and inside each project undone tasks always sit above done tasks (the done/undone barrier from the todo) with dated undone tasks above undated ones (a dated step is already committed to the todo, so it outranks the undated backlog). Giving a task a **date** mirrors it into the todo as a one-time date task under the project's own header (created via `POST /headers { name, projectId }`, which is idempotent per project and adopts a pre-`projectId` header matching by name; the server also owns where that header sits). The sync works both ways: toggling done on either side flips the other, deleting the todo task unlinks the project task, and when the nightly cron deletes the completed todo task the project task is marked done and retained in the project as a completed step.

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

### 3. Projects - Tasks (18 tests)

These tests verify project task CRUD, the done/undone and dated/undated barriers, the notes field, and the two-way todo sync.

#### Test: "should add an undated task (panel only, no todo entry)"

- **Description**: A task without a date lives only in the project
- **Steps**: Add a task "deploy to cpu" via the panel's add-task modal without picking a date
- **Expected Output**: The row appears without a date chip and no header is created in the todo

#### Test: "should mirror a dated task into the todo under the project header"

- **Description**: The core flow — a dated task shows up in the todo under the project's name
- **Steps**: Add a task "get data from EODHD" via the panel and pick today in the Date calendar
- **Expected Output**:
  - The row appears with a date chip
  - The project's todo header is created holding one task with a `date` ECD of today
  - The project task's `todoTaskId` links to the created todo task
  - The main todo view shows the task under the project header

#### Test: "does not create a duplicate todo task when the confirm button is clicked repeatedly during a save"

- **Description**: Guards against the re-entrancy race where clicking "Add task" again while the first save is still in flight spawned a second linked todo task (the project task ended up linked to only the last one, orphaning the earlier duplicate in the todo)
- **Steps**: Create a project via API and open the panel; install a route that holds the `POST /tasks` create open (a promise gate); open the add-task modal, fill a name and pick today's date, click "Add task"; assert the confirm button is disabled while the save is in flight and force a second click; release the gate and wait for the modal to close
- **Expected Output**: Exactly one todo header, one todo task under it, and one project task — the repeated clicks produce no duplicate

#### Test: "should add a task with notes shown in the panel"

- **Description**: A project task carries free-text notes, like a todo task
- **Steps**: Add an undated task "deploy to cpu" via the panel with notes "use the v2 API key"
- **Expected Output**: The row shows the notes text under the task name and the project task's `notes` field is persisted

#### Test: "should mirror project task notes onto the linked todo task"

- **Description**: A dated task's notes flow onto the todo task it creates
- **Steps**: Add a dated task "get data from EODHD" with notes "use the v2 API key"
- **Expected Output**: The linked todo task's `notes` equals "use the v2 API key"

#### Test: 'should give the linked todo task a "Step towards" note when the project task has none'

- **Description**: An empty note falls back to the origin-flagging default on the todo side
- **Steps**: Add a dated task "get data from EODHD" with no notes
- **Expected Output**: The linked todo task's `notes` is `Step towards "Automated Stock Market"`

#### Test: "should edit a task's notes and keep the linked todo task in step"

- **Description**: Editing a project task's notes updates the linked todo task too (project→todo)
- **Steps**: With a linked dated task, open Edit task, set notes to "prefer the REST feed", Save
- **Expected Output**: The panel row shows the new note and the linked todo task's `notes` updates to match

#### Test: "should adopt an existing header (case-insensitive) for dated tasks"

- **Description**: A header created before `projectId` existed is adopted by the project rather than duplicated — the server matches it by name, case-insensitively, and links it
- **Steps**: Create a header "automated stock market" via API; add a dated task to project "Automated Stock Market"
- **Expected Output**: No second header is created; the existing lowercase header keeps its own casing and now carries the project's `projectId`

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

#### Test: "should sort undone dated tasks above undated ones"

- **Description**: Dated steps outrank the undated backlog — a step with a date is already committed to the todo, so it sorts to the top
- **Steps**: Create a project via API sending an undated task first, then a dated undone task, then a dated **done** task
- **Expected Output**: The panel lists the dated undone task first, then the undated undone one, then the done one at the bottom

#### Test: "should not let moves cross the dated/undated barrier"

- **Description**: The dated/undated barrier is enforced like the done/undone one, so the panel never offers a swap the server would revert
- **Steps**: Create a project with two dated undone tasks and two undated undone tasks; move the second dated task up
- **Expected Output**: The two dated tasks swap; the last dated task's "down" and the first undated task's "up" arrows are disabled

#### Test: "should lift a task above the undated ones once it is given a date"

- **Description**: Adding a date in the edit modal re-sorts the task into the dated group
- **Steps**: Create a project with three undated tasks; edit the last one and give it today's date
- **Expected Output**: The newly dated task jumps to the top, above the two still-undated tasks

#### Test: "should drop a task below the dated ones once its date is removed"

- **Description**: Clearing the date drops the task into the undated group — but the sort is stable, so it keeps its position relative to the other undated tasks rather than being pushed to the end
- **Steps**: Create a project with two dated tasks (the first one linked to a todo task) and one undated task; edit the first task and switch its date mode to "None"
- **Expected Output**: The still-dated task moves to the top; the un-dated task sits between it and "deploy to cpu"; the linked todo task is removed from the header

#### Test: "should delete the linked todo task when the project task is deleted"

- **Description**: Deleting a linked project task cleans up its todo entry too
- **Steps**: Create a linked project task via API; delete it in the panel and confirm
- **Expected Output**: The confirm message warns "Its todo entry is removed too."; the row disappears and the header's task list is empty

#### Test: "should unlink the project task when its todo task is deleted from the todo"

- **Description**: Todo-side deletions flow back — the project task loses its link and date but stays undone
- **Steps**: Create a linked project task via API; delete the todo task from the todo view (with a reason)
- **Expected Output**: `GET /projects` shows the task with `date: null`, `done: false`, `todoTaskId: null`

### 4. Projects - Todo edit & order sync (6 tests)

These tests verify that todo-side edits and reorders flow back into the project, and that project reorders flow into the todo.

#### Test: "should update the project task date when the linked todo task's date is edited"

- **Description**: Changing the todo task's date changes the project task's date
- **Steps**: Create a linked project task dated today via API; in the todo view edit the task's date to the 1st of the current month (an earlier day, so no postpone-reason flow); save (skipped when today **is** the 1st)
- **Expected Output**: The project task's `date` becomes the 1st of the month and `todoTaskId` is unchanged

#### Test: "should clear the project task date when the todo task's date is removed"

- **Description**: Clearing the todo task's due date (Due → None) sets the project task's date to none
- **Steps**: Create a linked project task via API; in the todo view edit the task, select the "None" due mode, save
- **Expected Output**: The project task's `date` becomes `null` while `todoTaskId` is kept (only the date is gone)

#### Test: "should mirror edited todo notes onto the project task"

- **Description**: Editing the todo task's notes updates the linked project task's notes
- **Steps**: Create a linked project task (notes "old notes") and its todo task via API; in the todo view edit the task's notes to "fresh notes"; save
- **Expected Output**: The project task's `notes` become "fresh notes"

#### Test: "should not copy the todo's placeholder note into the project"

- **Description**: The `Step towards "<project>"` default note a no-notes project task carries in the todo must not become real project notes on a todo-side edit
- **Steps**: Create a linked project task with empty notes whose todo task carries the placeholder note; in the todo view rename the task, leaving the note untouched; save
- **Expected Output**: The project task's name updates but its `notes` stay empty

#### Test: "should mirror a project task reorder into the todo"

- **Description**: Moving a task within a project also reorders the linked todo tasks
- **Steps**: Create a header with two dated, linked todo tasks and their project via API; in the Projects panel move the second task up
- **Expected Output**: The project shows the new order and `GET /tasks` returns the todo tasks in the same swapped order

#### Test: "should mirror a todo reorder of linked tasks into the project"

- **Description**: Moving a linked task in the todo also reorders the project's task list
- **Steps**: Same setup; in the todo view move the second task up with the task card's arrow
- **Expected Output**: `GET /projects` returns the project tasks in the swapped order

### 5. Projects - Header order sync (5 tests)

_The ordering itself is enforced by the backend (`POST /headers { projectId }` and the project update/delete cascades); these tests assert the behaviour end to end through the UI._

#### Test: "places a new project header below the top header (priority 1), in project order"

- **Description**: When a project task creates its todo header and other headers already exist, the topmost existing header keeps priority 0 and the project headers form a contiguous block below it, ordered by project priority
- **Steps**: Create a non-project header "Groceries" via API; create two projects, "Home Improvement" (higher priority) then "Automated Stock Market"; in the Projects panel add a dated task to each so each gets a todo header
- **Expected Output**: `GET /headers` returns `["Groceries", "Home Improvement", "Automated Stock Market"]` (Groceries at 0, the project headers at 1 and 2 in project order)

#### Test: "orders project headers by project priority (starts at 0 with no other headers)"

- **Description**: With no non-project headers, the project headers block starts at priority 0 and follows project priority regardless of the order the tasks were added
- **Steps**: Create projects "Home Improvement" (higher priority) then "Automated Stock Market"; in the Projects panel add a dated task to the **lower**-priority project first, then to the higher-priority one
- **Expected Output**: `GET /headers` returns `["Home Improvement", "Automated Stock Market"]` (project order, not add order)

#### Test: "reorders the todo header when the project is moved"

- **Description**: Moving a project up/down re-sorts its todo header to match the new project order
- **Steps**: Seed two headers, two dated linked todo tasks and two matching projects via API (Home Improvement above Automated Stock Market); reload and open the Projects panel; click "Move project Automated Stock Market up"
- **Expected Output**: `GET /headers` flips to `["Automated Stock Market", "Home Improvement"]`, mirroring the new project order

#### Test: "adding a second dated task reuses the project header instead of duplicating it"

- **Description**: `POST /headers { projectId }` is idempotent per project, so a second dated task lands under the same header
- **Steps**: Create project "Automated Stock Market"; in the panel add two dated tasks to it
- **Expected Output**: `GET /headers` still returns exactly `["Automated Stock Market"]`

#### Test: "deleting a project unlinks its header, which keeps its tasks and leaves the block"

- **Description**: Deleting a project does not delete the todo work it produced — the header survives with its tasks, but stops being ordered with the projects
- **Steps**: Create a non-project header "Groceries", two projects with their linked headers and one todo task; `DELETE /projects/:id` for the first project
- **Expected Output**:
  - The response reports `headersUnlinked: 1`
  - `GET /headers` returns `["Groceries", "Automated Stock Market", "Home Improvement"]` — the remaining project header moves up into the block and the unlinked one falls after it
  - The unlinked header has `projectId: null` and still holds its task

### 6. Projects - Cron completion (1 test)

#### Test: "done dated task leaves the todo but is retained as done in the project"

- **Description**: The full lifecycle — once the todo task is done and the nightly cron runs, it is deleted from the todo but kept in the project as a completed step
- **Steps**: Create a linked, **done** todo task (dated yesterday) and its project via API; trigger `POST /cron/run`; reload and open the Projects view
- **Expected Output**:
  - The cron stats report `projectTasksCompleted: 1`
  - The header, left empty by the deletion, is removed in the same run
  - The project task is `done: true` with its date kept and `todoTaskId` cleared, sorted to the bottom
  - The panel shows the row with done styling and the badge "1/2 done"

---

## Summary

Total: **35 tests** across 6 categories, covering the Projects panel toggle, project CRUD and priority ordering, task CRUD with the done/undone and dated/undated barriers (including guarding a repeated-save against duplicate todo tasks), project task notes (shown in the panel and mirrored both ways onto/from the linked todo task, with the "Step towards …" placeholder mirroring back as empty), the two-way todo sync for dated tasks (done state, date, name and notes edits, and reordering), the server-owned project→todo header ordering (placement, idempotent create, project move, project delete), and the cron completion flow.
