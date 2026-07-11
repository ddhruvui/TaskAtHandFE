# Goals E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Goals functionality in the Task At Hand application. A goal is a long-term aim (like "Improve Health") broken into small steps/habits ("Wake up at 6", "Have 1 fruit a day") built **one step at a time**. A step is either **paused/pending** (numbered marker) or **under progress** (∞ marker): starting a step creates a daily recurring task under a todo header named "One Step At A Time" and the habit is kept for life; pausing removes that task. The sync works both ways — deleting the daily task (or the whole header) from the todo pauses the matching step(s).

## Test File Location

`e2e/goals.spec.ts`

## Purpose

These tests verify that users can create, edit, and delete goals, that Start/Pause correctly create and remove the daily task under the "One Step At A Time" header, and that todo-side deletions flow back into the goal (step paused, badge lowered).

---

## Test Categories

### 1. Goals - Panel (2 tests)

These tests verify the Goals view toggle and empty state.

#### Test: "should show empty state when no goals exist"

- **Description**: Checks that when there are no goals, a helpful message appears
- **Steps**: Open the Goals view with an empty database
- **Expected Output**: The text "No goals yet — add one!" is displayed to guide the user

#### Test: "should toggle goals button pressed state"

- **Description**: Verifies the Goals toolbar button toggles the view on and off
- **Steps**: Click the Goals toggle button, then click it again
- **Expected Output**:
  - After the first click `aria-pressed` is "true", the button gets the active style, and the panel is visible
  - After the second click `aria-pressed` is "false" and the panel is hidden

### 2. Goals - Create (5 tests)

These tests verify goal creation through the modal.

#### Test: "should create a goal with steps via UI"

- **Description**: Verifies a user can create a goal with steps using the interface
- **Steps**: Open the Goals view, click "Add goal", enter "Improve Health", type "Wake up at 6" and "Have 1 fruit a day" on separate lines, submit
- **Expected Output**:
  - A new goal section titled "Improve Health" appears with both steps in order
  - New steps are pending: numbered markers ("1", "2") and a Start button on each row
  - The empty state message disappears

#### Test: "should update the step count hint while typing"

- **Description**: Confirms the modal's live step counter tracks non-empty lines
- **Steps**: Open the add goal modal; type one step; then a mix of steps and blank lines
- **Expected Output**: The hint shows "0 steps", then "1 step", then "2 steps" (blank lines ignored)

#### Test: "should allow creating a goal without steps"

- **Description**: Unlike events, a goal can start as an empty backlog
- **Steps**: Open the add goal modal; observe the Add button is disabled; enter only a name; submit
- **Expected Output**:
  - Add is disabled until a name is entered (steps are optional)
  - The goal appears with the hint "No steps yet — edit the goal to list the small habits…"

#### Test: "should cancel the add goal modal"

- **Description**: Checks that clicking Cancel dismisses the goal creation form without saving
- **Steps**: Open the add goal modal, enter a name, click Cancel
- **Expected Output**: The modal closes and the empty state message is still shown

#### Test: "should close the add goal modal on Escape"

- **Description**: Verifies keyboard shortcut for closing the modal
- **Steps**: Open the add goal modal, press Escape in the name field
- **Expected Output**: The modal closes without creating a goal

### 3. Goals - Update (1 test)

#### Test: "should edit a goal via UI and keep statuses of kept steps"

- **Description**: Editing reopens the modal with the current name and steps; steps that keep their name keep their status
- **Steps**: Seed a goal with an under-progress step ("Wake up at 6") and a pending one; edit it: rename to "Get Healthy" and add a third line "Exercise 10 min"; save
- **Expected Output**:
  - The section shows the new name and all three steps in order
  - "Wake up at 6" still shows the "∞" marker (its under-progress status survived the edit) and the badge reads "1/3 under progress"
  - The old goal name is gone

### 4. Goals - Delete (2 tests)

#### Test: "should delete a goal with confirmation"

- **Description**: Verifies goal deletion asks for confirmation and clarifies tasks stay
- **Steps**: Seed a goal, click its delete button, confirm
- **Expected Output**:
  - The confirmation text 'Delete goal "Improve Health"? Tasks already added to the todo stay.' is shown
  - After confirming, the empty state message returns

#### Test: "should keep the goal when deletion is cancelled"

- **Description**: Ensures cancelling the confirmation leaves the goal untouched
- **Steps**: Seed a goal, click its delete button, click Cancel
- **Expected Output**: The goal section is still visible

### 5. Goals - One Step At A Time (6 tests)

These tests verify the step lifecycle side effects on the todo, in both directions.

#### Test: "should start a step and add it as a daily task under the One Step At A Time header"

- **Description**: Starting a pending step puts it under progress and promotes it into the todo as a daily habit
- **Steps**: Seed a goal with two pending steps; click Start on "Wake up at 6"; switch back to the todo view
- **Expected Output**:
  - A notice 'Started "Wake up at 6" — under progress as a daily habit…' appears
  - The step row shows the "∞" marker and a Pause button
  - The badge rises immediately to "1/2 under progress"
  - The todo has a "One Step At A Time" header containing the task "Wake up at 6"

#### Test: "should reuse the One Step At A Time header when starting a second step"

- **Description**: Starting more steps must not create duplicate headers
- **Steps**: Start both steps of a goal; query headers via API; switch to the todo view
- **Expected Output**:
  - Both rows show "∞" and the badge reads "2/2 under progress"
  - Exactly one header named "One Step At A Time" exists
  - It contains both tasks, in the order the steps were started

#### Test: "should pause the step when its daily task is deleted from the todo"

- **Description**: The sync works from the todo side — deleting the daily task pauses the step
- **Steps**: Start "Wake up at 6" (badge "1/2 under progress"); switch to the todo view; delete the task "Wake up at 6" with the normal task delete flow; reopen the Goals view
- **Expected Output**:
  - The step shows a Start button and a numbered ("1") marker again
  - The badge drops to "0/2 under progress"

#### Test: "should pause all started steps when the One Step At A Time header is deleted"

- **Description**: Deleting the whole header (cascade-deleting its daily tasks) pauses every started step
- **Steps**: Start both steps (badge "2/2 under progress"); switch to the todo view; delete the "One Step At A Time" header; reopen the Goals view
- **Expected Output**:
  - The badge reads "0/2 under progress"
  - Both step rows show Start buttons again

#### Test: "should retire an under-progress habit via pause and remove its daily task"

- **Description**: Pausing an under-progress habit seeded from the API removes its daily task
- **Steps**: Seed a goal whose step is already under progress plus its daily task under "One Step At A Time" (via API, mirroring what Start creates); click Pause on the step; switch to the todo view
- **Expected Output**:
  - The step marker shows "∞" and the badge "1/1 under progress" before pausing
  - A notice containing "paused — moved back to the backlog" appears
  - The step row shows a Start button again and the badge drops to "0/1 under progress"
  - The "One Step At A Time" header no longer contains the task

#### Test: "should pause a step back to the backlog and remove its daily task"

- **Description**: Pausing a step started in the same session removes its daily task
- **Steps**: Seed a goal with one step; start it (∞ marker, badge "1/1 under progress"); click Pause; switch to the todo view
- **Expected Output**:
  - A notice containing "paused — moved back to the backlog" appears
  - The step row shows a Start button again and the badge drops to "0/1 under progress"
  - The "One Step At A Time" header no longer contains the task

---

## Test Helpers Used

- `cleanDatabase()`: Removes all headers/tasks to start fresh
- `cleanGoals()`: Removes all goals via API
- `createGoal()`: Creates a goal via API (fast setup; steps may carry a status)
- `createHeader()` / `createTask()`: Seed the "One Step At A Time" header and a daily task the way Start would
- `deleteTaskViaUI()` / `deleteHeaderViaUI()`: Exercise the todo-side delete flows that trigger the goal sync
- `getHeaders()`: Reads headers via API (used to assert header reuse)
- `getTaskNamesInHeader()`: Lists task names under a header in the todo view
- `waitForPageLoad()`: Ensures the page is fully loaded before testing

---

## Technology Stack

- **Testing Framework**: Playwright
- **Test Type**: End-to-End (E2E)
- **Browser**: Tests run in actual browser environments

---

## Summary

These 16 tests comprehensively verify that:

1. ✅ Goals can be created (with or without steps) with proper validation
2. ✅ Goals display correctly with empty states and ordered, numbered steps
3. ✅ Editing a goal preserves the status of steps that keep their name
4. ✅ Goals can be safely deleted with confirmation, without touching todo tasks
5. ✅ Starting a step puts it under progress and creates its daily task under "One Step At A Time" (header reused, never duplicated); pausing removes the task and lowers the badge
6. ✅ The sync works both ways: deleting the daily task — or the whole header — from the todo pauses the matching step(s)

The tests ensure the "one step at a time" habit-building flow works end to end against the real backend.
