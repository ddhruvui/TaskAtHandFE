# Events E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Events functionality in the Task At Hand application. An event is a reusable bundle of tasks (like "Burger Night" with its shopping list). The Events view lists them as an accordion: each row shows the event name, a task count, a one-line preview when collapsed, edit/delete icons (revealed on hover) and an always-visible "Add to todo" button; expanding a row shows its numbered tasks. "Add to todo" opens a modal with Today / Tomorrow / Saturday date shortcuts, a calendar and a checklist of the event's tasks. Confirming creates the selected tasks, in template order, as one-time date tasks under a header named after the event (reused case-insensitively, created otherwise). The template is never consumed.

## Test File Location

`e2e/events.spec.ts`

## Purpose

These tests verify that users can create, edit and delete events; that the accordion opens the right event and toggles independently; that scheduling adds the selected tasks under the event's header (reusing it on repeat); that the date shortcuts set the task date; and that the success notice links back to the todo list.

---

## Test Categories

### 1. Events - Panel (2 tests)

These tests verify the Events view toggle and empty state.

#### Test: "should show empty state when no events exist"

- **Description**: Checks that a helpful message appears when there are no events
- **Steps**: Open the Events view with an empty database
- **Expected Output**: The text "No events yet — add one!" is displayed

#### Test: "should toggle events button pressed state"

- **Description**: Verifies the Events toolbar button toggles the view on and off
- **Steps**: Click the Events toggle button, then click it again
- **Expected Output**:
  - After the first click `aria-pressed` is "true" and the button has the active class
  - After the second click `aria-pressed` is "false" and the panel is hidden

### 2. Events - Create (5 tests)

These tests verify the add-event modal.

#### Test: "should create an event via UI"

- **Description**: Creates an event with three tasks through the modal
- **Steps**: Click "Add event", enter "Burger Night" and three task lines, click "Add"
- **Expected Output**: The event's section lists the three tasks in order and the empty state is gone

#### Test: "should update the task count hint while typing"

- **Description**: Checks the live task-count hint under the textarea
- **Steps**: Open the add modal, type one task, then two tasks separated by blank lines
- **Expected Output**: The hint reads "0 tasks", then "1 task", then "2 tasks" (blank lines ignored)

#### Test: "should disable Add button until name and tasks are filled"

- **Description**: Verifies the confirm button's enabled state
- **Steps**: Open the add modal, fill the name, then fill a task
- **Expected Output**: "Add" stays disabled until both the name and at least one task are filled

#### Test: "should cancel the add event modal"

- **Description**: Verifies Cancel discards the draft
- **Steps**: Open the add modal, type a name, click "Cancel"
- **Expected Output**: The modal closes and the empty state is still shown

#### Test: "should close the add event modal on Escape"

- **Description**: Verifies Escape closes the modal
- **Steps**: Open the add modal and press Escape in the name field
- **Expected Output**: The modal closes

### 3. Events - Update (1 test)

#### Test: "should edit an event via UI"

- **Description**: Renames an event and replaces its tasks
- **Steps**: Create "Burger Night" via the API, click "Edit event Burger Night", rename to "Pizza Night" with two new tasks, click "Save"
- **Expected Output**: The "Pizza Night" section lists the new tasks and "Burger Night" is gone

### 4. Events - Delete (2 tests)

#### Test: "should delete an event with confirmation"

- **Description**: Deletes an event through the confirm dialog
- **Steps**: Click "Delete event Burger Night", confirm with "Delete"
- **Expected Output**: The confirm message mentions tasks already in the todo stay; afterwards the empty state shows

#### Test: "should keep the event when deletion is cancelled"

- **Description**: Cancelling the confirm dialog keeps the event
- **Steps**: Click "Delete event Burger Night", click "Cancel"
- **Expected Output**: The event's section is still visible

### 5. Events - Add to todo (6 tests)

These tests verify the schedule modal and how tasks land in the todo.

#### Test: "should open the schedule modal with all tasks preselected"

- **Description**: Checks the schedule modal's initial state
- **Steps**: Click "Add Burger Night to todo" for a three-task event
- **Expected Output**: The title reads "Add to todo — Burger Night", the confirm reads "Add 3 tasks" and three checkboxes are checked

#### Test: "should add all event tasks under a header named after the event"

- **Description**: Schedules every task for today
- **Steps**: Open the schedule modal and click "Add 2 tasks"
- **Expected Output**: The notice reads `Added 2 tasks under "Burger Night" for <today>.`, the event is still listed, and the todo's "Burger Night" header holds both tasks in order

#### Test: "should only add the selected tasks"

- **Description**: Unmarked tasks are skipped
- **Steps**: Unmark "Procure onion", click "Add 1 task"
- **Expected Output**: The modal closes and the todo header holds only "Procure bun"

#### Test: "should toggle all tasks with the select all button"

- **Description**: Verifies "Unselect all" / "Select all"
- **Steps**: Click "Unselect all", then "Select all"
- **Expected Output**: The confirm becomes "Add 0 tasks" (disabled), then "Add 2 tasks" (enabled)

#### Test: "should quick add a single task from its row"

- **Description**: The per-task add opens the modal with only that task selected
- **Steps**: Click `Add "Procure onion" to todo` on the task row, then "Add 1 task"
- **Expected Output**: The todo header holds only "Procure onion"

#### Test: "should reuse the existing header when scheduling twice"

- **Description**: A second schedule joins the existing header
- **Steps**: Schedule the event twice
- **Expected Output**: Exactly one "Burger Night" header exists, holding two tasks

### 6. Events - Accordion (2 tests)

These tests verify the expand/collapse behaviour of the event list.

#### Test: "should expand exactly one event on load and toggle others"

- **Description**: Only the first event starts open; others toggle independently
- **Steps**: Create two events via the API, open the view, expand the collapsed one, then collapse the first
- **Expected Output**:
  - On load exactly one toggle has `aria-expanded="true"` and one task list is shown
  - The collapsed event shows "2 tasks" and a preview line
  - After expanding it, both lists show and no preview remains
  - After collapsing the first, one list remains

#### Test: "should open a newly created event"

- **Description**: A newly created event opens so its tasks are in view
- **Steps**: With one event already listed, add "Pizza Night" through the modal
- **Expected Output**: "Pizza Night" has `aria-expanded="true"` and lists "Procure dough"

### 7. Events - Date shortcuts and notice (2 tests)

#### Test: "should schedule for tomorrow with the date shortcut"

- **Description**: The Tomorrow shortcut sets the task date
- **Steps**: Open the schedule modal, check "Today" is pressed, click "Tomorrow", click "Add 1 task"
- **Expected Output**: "Tomorrow" becomes pressed and "Today" unpressed; the notice reads `Added 1 task under "Burger Night" for <tomorrow>.`

#### Test: "should go back to the todo from the notice"

- **Description**: The notice's "View in todo" leaves the Events view
- **Steps**: Schedule the event, click "View in todo"
- **Expected Output**: The Events panel is hidden, the Events toggle has `aria-pressed="false"`, and the todo's "Burger Night" header holds the task

---

## Summary

| Category                            | Tests  |
| ----------------------------------- | ------ |
| Events - Panel                      | 2      |
| Events - Create                     | 5      |
| Events - Update                     | 1      |
| Events - Delete                     | 2      |
| Events - Add to todo                | 6      |
| Events - Accordion                  | 2      |
| Events - Date shortcuts and notice  | 2      |
| **Total**                           | **20** |
