# Goals E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Goals functionality in the Task At Hand application. A goal is a long-term aim (like "Improve Health") broken into small steps/habits ("Wake up at 6", "Have 1 fruit a day") built **one step at a time**. A step is either **paused/pending** (unchecked box, `[ Not started ]` badge) or **under progress** (checked box, `[ ↻ Daily ]` or `[ ↻ Mon, Wed, Fri ]` badge): starting a step opens a day picker and creates a recurring task on the chosen weekdays under a todo header named "One Step At A Time", kept for life; pausing removes that task. The sync works both ways — deleting the daily task (or the whole header) from the todo pauses the matching step(s).

Step rows render with the todo's own row markup (`.task-card*` classes from `TaskCard.css`), so the checkbox toggles the step lifecycle and the status badge sits in the slot the todo uses for the ECD. Steps are added one at a time from a `+` button on the goal heading — the same gesture as adding a task to a header — and each row carries move up/down and delete, just like a todo task. Goals themselves are ordered by a server-side contiguous `priority` and moved with arrows on the heading. There is deliberately **no** Edit control on a goal heading: a goal's name and starting steps are fixed at creation.

An under-progress row also carries a **days control** (the only way to reschedule the habit, since the todo locks a goal-managed task's ECD) and a **streak badge** (`🔥 N`) read from `GET /insights/stats`. The nightly archive only records a result on days the task's ECD covers, so the streak counts scheduled days only — a Mon/Wed/Fri habit is not broken by an untouched Tuesday.

## Test File Location

`e2e/goals.spec.ts`

## Purpose

These tests verify that users can create and delete goals, reorder goals and their steps, add and delete steps one at a time from the goal rows, that Start/Pause correctly create and remove the task under the "One Step At A Time" header, that the day picker drives both the step badge and its task's `day_of_week` ECD, that the streak badge reflects the archived results for those days, and that todo-side deletions flow back into the goal (step paused, badge lowered).

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

### 2. Goals - Create (10 tests)

These tests verify goal creation through the modal and step creation from the goal heading.

#### Test: "should create a goal with steps via UI"

- **Description**: Verifies a user can create a goal with steps using the interface
- **Steps**: Open the Goals view, click "Add goal", enter "Improve Health", type "Wake up at 6" and "Have 1 fruit a day" on separate lines, submit
- **Expected Output**:
  - A new goal section titled "Improve Health" appears with both steps in order
  - New steps are pending: `[ Not started ]` badges, no checked boxes, and a Start action on each row
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
  - The goal appears with the hint "No steps yet — add one!"

#### Test: "should add a step from the goal heading like adding a task"

- **Description**: Verifies the todo-style add gesture — a `+` on the goal heading opens a step modal that appends one step
- **Steps**: Seed a goal with one step, open the Goals view, click "Add step to Improve Health", enter "Have 1 fruit a day", submit
- **Expected Output**:
  - The modal title reads "Add step — Improve Health"
  - The new step is appended after the existing one (order preserved)
  - It starts pending with a `[ Not started ]` badge

#### Test: "should add the first step to a goal that has none"

- **Description**: Confirms the add-step flow works against an empty backlog and clears the empty state
- **Steps**: Seed a goal with no steps, open the Goals view, add "Track every expense" via the heading `+`
- **Expected Output**: "No steps yet — add one!" disappears and the step appears with a `[ Not started ]` badge

#### Test: "should submit a new step on Enter"

- **Description**: Verifies keyboard submit in the add step modal, matching the add task modal
- **Steps**: Open the add step modal, type "Walk 20 min", press Enter in the name field
- **Expected Output**: The step is created with a `[ Not started ]` badge without clicking the confirm button

#### Test: "should not add a step when the name is blank"

- **Description**: Guards against creating unnamed steps
- **Steps**: Open the add step modal; observe the confirm button; type only whitespace
- **Expected Output**: "Add step" stays disabled both when empty and when the field holds only spaces

#### Test: "should close the add step modal on Escape without adding"

- **Description**: Verifies Escape discards a partially typed step
- **Steps**: Open the add step modal, type "Discarded step", press Escape in the name field
- **Expected Output**: The modal closes and the goal still shows "No steps yet — add one!"

#### Test: "should cancel the add goal modal"

- **Description**: Checks that clicking Cancel dismisses the goal creation form without saving
- **Steps**: Open the add goal modal, enter a name, click Cancel
- **Expected Output**: The modal closes and the empty state message is still shown

#### Test: "should close the add goal modal on Escape"

- **Description**: Verifies keyboard shortcut for closing the modal
- **Steps**: Open the add goal modal, press Escape in the name field
- **Expected Output**: The modal closes without creating a goal

### 3. Goals - Ordering (9 tests)

These tests verify goal-level and step-level reordering, the under-progress-first step sort with its move barrier, and that the Edit control is gone.

#### Test: "should move a goal up and down like a todo header"

- **Description**: Verifies the heading arrows reorder goals and that goals sort by priority, not name
- **Steps**: Create "Improve Health" then "Better Finances"; move the second up, then back down
- **Expected Output**:
  - Initial order is creation order ("Improve Health", "Better Finances") — proving the sort is by priority, not alphabetical
  - Moving up swaps them; moving down restores the original order

#### Test: "should disable the move arrows at the ends of the goal list"

- **Description**: Guards against moves that would fall outside `0..n-1`
- **Steps**: Create two goals and inspect the first goal's up arrow and the last goal's down arrow
- **Expected Output**: Both are disabled

#### Test: "should keep the new goal order after a reload"

- **Description**: Confirms the reorder is persisted server-side rather than held in component state
- **Steps**: Move a goal up, reload the page, reopen the Goals view
- **Expected Output**: The moved order survives the reload

#### Test: "should move a step up and down within its goal"

- **Description**: Verifies the per-step arrows reorder the goal's step list
- **Steps**: Seed a goal with three steps; move the third up; then move the (new) first down
- **Expected Output**: The step list reflects each swap in order

#### Test: "should disable step arrows at the ends of the step list"

- **Description**: The first step cannot move up and the last cannot move down
- **Steps**: Seed a goal with two steps and inspect the boundary arrows
- **Expected Output**: Both are disabled

#### Test: "should sort under-progress steps above the pending backlog"

- **Description**: Under-progress steps always render above pending ones, regardless of stored order
- **Steps**: Seed a goal whose third (last-created) step is `under_progress` and two earlier steps are pending; open the Goals view
- **Expected Output**: The started step renders first, followed by the pending steps in their original order

#### Test: "should move a step to the top group when it starts"

- **Description**: Starting a step lifts it into the under-progress block at the top, and the new order is persisted
- **Steps**: Seed a goal with three pending steps; Start the last one; reload and reopen the Goals view
- **Expected Output**: The started step shows first with the `[ ↻ Daily ]` badge, and the order survives the reload

#### Test: "should not move steps across the started/pending barrier"

- **Description**: The move arrows never mix the under-progress block with the pending backlog (mirror of the todo's done/undone barrier)
- **Steps**: Seed a goal with one under-progress step above one pending step; inspect the boundary arrows
- **Expected Output**: The started step's down arrow and the pending step's up arrow are both disabled

#### Test: "should not offer an Edit control on the goal heading"

- **Description**: Locks in the removal of goal editing — the heading has move/delete/add only
- **Steps**: Seed a goal and look for an "Edit goal …" button
- **Expected Output**: No such button exists

### 4. Goals - Delete goal (2 tests)

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

### 5. Goals - Delete step (3 tests)

These tests verify per-step deletion, including the todo cleanup it must perform.

#### Test: "should delete a pending step after confirmation"

- **Description**: A backlog step can be removed from its row
- **Steps**: Seed a goal with two steps, click delete on the second, confirm
- **Expected Output**: The confirmation names the step and its goal; afterwards only the first step remains

#### Test: "should keep the step when the delete is cancelled"

- **Description**: Cancelling the confirmation leaves the step untouched
- **Steps**: Click delete on a step, then Cancel
- **Expected Output**: The step is still listed

#### Test: "should remove the daily task when an under-progress step is deleted"

- **Description**: Deleting a started step must also drop the "One Step At A Time" task it owns, or the todo keeps an orphan habit
- **Steps**: Seed a goal with one step, start it, then delete the step and confirm
- **Expected Output**:
  - The confirmation warns 'Its daily task in "One Step At A Time" is removed too'
  - The goal falls back to "No steps yet — add one!"
  - The "One Step At A Time" header holds no tasks

### 6. Goals - One Step At A Time (6 tests)

These tests verify the step lifecycle side effects on the todo, in both directions.

#### Test: "should start a step and add it as a daily task under the One Step At A Time header"

- **Description**: Starting a pending step puts it under progress and promotes it into the todo as a habit on every day
- **Steps**: Seed a goal with two pending steps; click Start on "Wake up at 6" and confirm the day picker's default; switch back to the todo view
- **Expected Output**:
  - A notice 'Started "Wake up at 6" — under progress every Sun, Mon, Tue, Wed, Thu, Fri, Sat…' appears
  - The step row shows a checked box with the `[ ↻ Daily ]` badge and a Pause action
  - The badge rises immediately to "1/2 under progress"
  - The todo has a "One Step At A Time" header containing the task "Wake up at 6"

#### Test: "should reuse the One Step At A Time header when starting a second step"

- **Description**: Starting more steps must not create duplicate headers
- **Steps**: Start both steps of a goal; query headers via API; switch to the todo view
- **Expected Output**:
  - Both rows show `[ ↻ Daily ]` and the badge reads "2/2 under progress"
  - Exactly one header named "One Step At A Time" exists
  - It contains both tasks, in the order the steps were started

#### Test: "should pause the step when its daily task is deleted from the todo"

- **Description**: The sync works from the todo side — deleting the daily task pauses the step
- **Steps**: Start "Wake up at 6" (badge "1/2 under progress"); switch to the todo view; delete the task "Wake up at 6" with the normal task delete flow; reopen the Goals view
- **Expected Output**:
  - The step shows a Start action and the `[ Not started ]` badge again
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
  - The step shows `[ ↻ Daily ]` and the badge "1/1 under progress" before pausing
  - A notice containing "paused — moved back to the backlog" appears
  - The step row shows a Start button again and the badge drops to "0/1 under progress"
  - The "One Step At A Time" header no longer contains the task

#### Test: "should pause a step back to the backlog and remove its daily task"

- **Description**: Pausing a step started in the same session removes its daily task
- **Steps**: Seed a goal with one step; start it (`[ ↻ Daily ]` badge, "1/1 under progress"); click Pause; switch to the todo view
- **Expected Output**:
  - A notice containing "paused — moved back to the backlog" appears
  - The step row shows a Start button again and the badge drops to "0/1 under progress"
  - The "One Step At A Time" header no longer contains the task

---

### 7. Goals - Habit days (10 tests)

These tests verify the day picker that Start opens, and the schedule it writes onto both the step and its todo task.

#### Test: "should start a step only on the days picked in the modal"

- **Description**: The picked weekdays become the step's schedule and its task's ECD
- **Steps**: Seed a goal with one pending step; click Start; select Mon/Wed/Fri; confirm
- **Expected Output**:
  - The step badge reads `[ ↻ Mon, Wed, Fri ]` instead of `[ ↻ Daily ]`
  - A notice 'Started "Gym" — under progress every Mon, Wed, Fri' appears
  - The task's ECD is `{ type: "day_of_week", value: ["Mon", "Wed", "Fri"] }` (week order)

#### Test: "should show the picked days on the habit's todo task too"

- **Description**: The todo card shows the same day list the goal row does
- **Steps**: Start a step on Sat/Sun; switch to the todo view
- **Expected Output**: The task card's ECD badge reads `[ ↻ Sun, Sat ]` — Sunday-first week order, matching what the backend stores

#### Test: "should default the picker to every day"

- **Description**: The picker opens with the whole week selected, preserving the pre-existing behavior of Start
- **Steps**: Click Start; inspect the picker; confirm without changing anything
- **Expected Output**:
  - The hint reads "Due every Sun, Mon, Tue, Wed, Thu, Fri, Sat" and all seven toggles are `aria-pressed="true"`
  - The resulting badge collapses back to `[ ↻ Daily ]`

#### Test: "should offer weekday and weekend presets"

- **Description**: The presets set the selection in one click
- **Steps**: Click Start; click "Weekdays"; confirm
- **Expected Output**: The badge reads `[ ↻ Mon, Tue, Wed, Thu, Fri ]`

#### Test: "should not let a step start with no day selected"

- **Description**: A habit needs at least one day to run on
- **Steps**: Click Start; toggle all seven days off
- **Expected Output**: The hint reads "Pick at least one day…" and the confirm button is disabled

#### Test: "should leave the step pending when the picker is cancelled"

- **Description**: Cancelling the picker starts nothing
- **Steps**: Click Start; click Cancel
- **Expected Output**: The picker closes, the badge stays `[ Not started ]`, the count stays "0/1 under progress", and no task exists under "One Step At A Time"

#### Test: "should not offer a days control on a pending step"

- **Description**: Only a started step has a schedule to change; a pending one is asked for its days when it starts
- **Steps**: Seed a goal with one pending step and open the Goals view
- **Expected Output**: No "Change days for step Gym" button exists on the row

#### Test: "should change a started step's days and rewrite its task ECD"

- **Description**: Rescheduling a running habit updates the goal and the todo together
- **Steps**: Start a step on Mon/Wed/Fri; click its days control; select Tue/Thu; save
- **Expected Output**:
  - The badge reads `[ ↻ Tue, Thu ]` and a notice '"Gym" is now due every Tue, Thu' appears
  - The task's ECD is `{ type: "day_of_week", value: ["Tue", "Thu"] }`

#### Test: "should keep the chosen days after a reload"

- **Description**: The schedule is persisted on the goal, not held in component state
- **Steps**: Start a step on Mon/Wed/Fri; reload; reopen the Goals view
- **Expected Output**: The badge still reads `[ ↻ Mon, Wed, Fri ]`

#### Test: "should restore the chosen days when a paused step is started again"

- **Description**: Pausing shelves the step but keeps its schedule, so the picker reopens on it
- **Steps**: Start a step on Mon/Wed/Fri; pause it; click Start again
- **Expected Output**: The picker hint reads "Due every Mon, Wed, Fri", and confirming restores the `[ ↻ Mon, Wed, Fri ]` badge

---

### 8. Goals - Habit streak (3 tests)

These tests verify the `🔥 N` badge on an under-progress row. Streaks come from the nightly archive (`GET /insights/stats`), which only records a result on days the task's ECD covers, so these tests run the cron once via `runCron()` to produce yesterday's outcome. Step names are unique per test because the archive is not wiped between tests and habits are matched by name.

#### Test: "should show a zero streak for a habit missed yesterday"

- **Description**: An untouched habit scores a miss and shows a zero streak
- **Steps**: Start a step on every day; run the cron; reload and reopen the Goals view
- **Expected Output**: The row's streak badge reads "🔥 0"

#### Test: "should count a day the habit was completed"

- **Description**: A completed day is counted into the streak
- **Steps**: Start a step on every day; tick its task done in the todo (waiting for the done write to land); run the cron; reload and reopen the Goals view
- **Expected Output**: The row's streak badge reads "🔥 1"

#### Test: "should not show a streak on a pending step"

- **Description**: A step that has never started has no habit history to show
- **Steps**: Seed a goal with one pending step and open the Goals view
- **Expected Output**: No `.goals-panel__step-streak` element exists on the row

---

## Test Helpers Used

- `cleanDatabase()`: Removes all headers/tasks to start fresh
- `cleanGoals()`: Removes all goals via API
- `createGoal()`: Creates a goal via API (fast setup; steps may carry a status)
- `createHeader()` / `createTask()`: Seed the "One Step At A Time" header and a daily task the way Start would
- `deleteTaskViaUI()` / `deleteHeaderViaUI()`: Exercise the todo-side delete flows that trigger the goal sync
- `getHeaders()`: Reads headers via API (used to assert header reuse)
- `getTasks()`: Reads a header's tasks via API (used to assert the habit's `day_of_week` ECD)
- `getTask()` / `toggleTaskDone()`: Find and tick a habit's task in the todo view
- `runCron()`: Triggers `POST /cron/run` so yesterday's habit result is archived and a streak exists to read
- `getTaskNamesInHeader()`: Lists task names under a header in the todo view
- `waitForPageLoad()`: Ensures the page is fully loaded before testing

---

## Technology Stack

- **Testing Framework**: Playwright
- **Test Type**: End-to-End (E2E)
- **Browser**: Tests run in actual browser environments

---

## Summary

These 45 tests comprehensively verify that:

1. ✅ Goals can be created (with or without steps) with proper validation
2. ✅ Steps can be added one at a time from the goal heading's `+`, exactly as tasks are added to a header — appended in order, validated against blank names, submitted on Enter and discarded on Escape
3. ✅ Goals display correctly with empty states and ordered steps carrying the todo's row markup and status badges
4. ✅ Goals are ordered by a persisted priority (not by name) and reorder with heading arrows, which are disabled at the ends of the list and survive a reload
5. ✅ Steps reorder within their goal with per-step arrows, disabled at the ends of the step list; under-progress steps always sort above the pending backlog (starting a step lifts it to the top group, persisted across reloads) and moves never cross that barrier
6. ✅ There is no Edit control on a goal heading — a goal's name and starting steps are fixed at creation
7. ✅ Individual steps can be deleted with confirmation, and deleting an under-progress step also removes its "One Step At A Time" daily task so no orphan habit is left behind
8. ✅ Goals can be safely deleted with confirmation, without touching todo tasks
9. ✅ Starting a step puts it under progress and creates its daily task under "One Step At A Time" (header reused, never duplicated); pausing removes the task and lowers the badge
10. ✅ The sync works both ways: deleting the daily task — or the whole header — from the todo pauses the matching step(s)
11. ✅ Start opens a day picker defaulting to the whole week, with weekday/weekend presets, that refuses an empty selection and starts nothing when cancelled; the chosen days drive both the step badge and its task's `day_of_week` ECD, survive a reload and are remembered across a pause
12. ✅ An under-progress step can be rescheduled from its own row (the only way in, since the todo locks a goal-managed task's ECD), rewriting the goal and the task together
13. ✅ The `🔥 N` streak badge on an under-progress row reflects the archived results for that habit — 0 after a missed day, 1 after a completed one — and never appears on a pending step

The tests ensure the "one step at a time" habit-building flow works end to end against the real backend.
