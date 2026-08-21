# Vacation E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Vacation functionality in the Task At Hand application. A vacation is a period the user booked off, stored as a start and an end date that are **both inclusive** — the day you leave and the day you get back are both vacation days — and both mandatory, which is what lets a trip be booked months in advance. Ranges may not overlap, and a trip can be corrected after the fact (forgot to book it, came home early) or deleted.

Vacation is a **lens on the history, not a pause button**: the backend cron runs exactly as it always does and anything ticked off while away still counts. What changes is how the archive is read — a missed day on vacation is *paused* rather than missed, slippage has the days away subtracted from it, and habit streaks restart on return rather than spanning the break.

The Vacation view also holds the **re-date list**: the undone one-time dated tasks that fall inside a window, each of which can be moved to a new date. Those moves carry a `vacationMove` flag so they are never counted as procrastination — the flag is required rather than inferred because a trip booked in advance is re-dated *before* it starts, so the reschedule's own timestamp proves nothing.

## Test File Location

`e2e/vacation.spec.ts`

## Purpose

These tests verify that users can open the Vacation view, book and correct vacations with inclusive dates, that overlapping ranges are rejected, that the re-date list offers exactly the tasks that can actually be moved (and flags those moves correctly in the archive), and that an active vacation is impossible to miss — a banner shows in every view, not just this one.

---

## Test Categories

### 1. Empty state and navigation (3 tests)

These tests verify the Vacation view toggle, its empty state, and its exclusivity with the other panels.

#### Test: "shows the empty message with no vacations booked"

- **Description**: Checks that with nothing booked, a helpful message explains what a vacation does
- **Steps**: Open the Vacation view with an empty database
- **Expected Output**: The text "No vacations yet — add one!" is displayed

#### Test: "the toggle is exclusive with the other panels"

- **Description**: Verifies the Vacation panel closes when another panel opens
- **Steps**: Open the Vacation view, then click the Insights toggle
- **Expected Output**: The Vacation panel is no longer visible

#### Test: "toggling off returns to the todo list"

- **Description**: Verifies clicking the active toggle returns to the task views
- **Steps**: Open the Vacation view, then click the Vacation toggle again
- **Expected Output**: The panel is hidden and the "Add header" button is visible again

### 2. Booking a vacation (5 tests)

These tests verify creation, the inclusive-date rule, ordering, and the overlap guard.

#### Test: "books a vacation and lists it with its length"

- **Description**: Checks that a vacation is listed with its length and note, and counts both ends
- **Steps**: Create a vacation from day +10 to day +14 via API, open the view
- **Expected Output**: One row, reading "5 days" (not four — both ends count), the note, and "upcoming"

#### Test: "a one-day vacation reads as 1 day"

- **Description**: Verifies the inclusive rule at its smallest
- **Steps**: Create a vacation whose start and end are the same day
- **Expected Output**: The row reads "1 day"

#### Test: "creates a vacation through the modal"

- **Description**: Verifies the booking modal end to end
- **Steps**: Open the view, click "Add vacation", type a note, click "Book"
- **Expected Output**: The modal closes, the row appears with the note, and the stored vacation defaults to today → today (a single inclusive day)

#### Test: "surfaces the backend's overlap rejection"

- **Description**: Verifies overlapping ranges are refused and the error is shown, not swallowed
- **Steps**: Create a vacation covering today, then book again (the modal defaults to today → today, so it always collides)
- **Expected Output**: "overlaps an existing one" is displayed and only one vacation is stored

#### Test: "orders vacations oldest start date first"

- **Description**: Verifies list ordering is chronological regardless of creation order
- **Steps**: Create a later vacation first, then an earlier one
- **Expected Output**: The earlier trip is the first row

### 3. Editing and deleting (3 tests)

These tests verify the correct-it-afterwards cases.

#### Test: "shortens a vacation when the user comes home early"

- **Description**: Verifies the edit modal opens pre-filled and saves
- **Steps**: Click the edit icon on a row, change the note, click "Save"
- **Expected Output**: The modal title reads "Edit Vacation" and the row shows the new note

#### Test: "deletes a vacation after confirmation"

- **Description**: Verifies deletion, including the warning about what deletion means
- **Steps**: Click the delete icon, read the confirmation, confirm
- **Expected Output**: The confirmation explains those days "count as ordinary days again"; the row disappears and nothing is stored

#### Test: "cancelling the delete keeps the vacation"

- **Description**: Verifies the cancel path
- **Steps**: Click the delete icon, then Cancel
- **Expected Output**: The row is still present

### 4. The re-date list (5 tests)

These tests verify which tasks are offered for re-dating, and that a move is recorded as a vacation move rather than a postponement.

#### Test: "lists a one-time dated task that falls inside the vacation"

- **Description**: Verifies the list content and its header labelling
- **Steps**: Create a dated task inside the window, open the row's "Tasks" list
- **Expected Output**: One task row, named correctly, showing its header name

#### Test: "does not list recurring tasks — they are exempted, not moved"

- **Description**: Verifies recurring tasks are deliberately absent, with the reason shown to the user
- **Steps**: Create a `day_of_week` task, open the list
- **Expected Output**: No task rows, and the copy explains repeating tasks aren't listed because they can't be moved without changing their schedule

#### Test: "does not list tasks outside the window"

- **Description**: Verifies the window bound
- **Steps**: Create a dated task after the vacation ends, open the list
- **Expected Output**: No task rows

#### Test: "re-dates a task and flags the move as a vacationMove"

- **Description**: The core of the feature — a planned move must never read as procrastination
- **Steps**: Open the list, click "Pick a new date", confirm the default
- **Expected Output**:
  - The dialog states the move won't be counted as procrastination
  - The task leaves the list (it no longer falls inside the window)
  - The task's ECD is the **first day back** (the default)
  - The archived `task_rescheduled` event has `pushedLater: true` **and** `vacationMove: true`

#### Test: "collapses the task list when toggled again"

- **Description**: Verifies the expand/collapse toggle
- **Steps**: Open the list, then click the same control again
- **Expected Output**: The list is hidden

### 5. The active-vacation banner (4 tests)

These tests verify the banner that exists because booking time off and forgetting is this feature's real failure mode. It shows in every view **except** the Vacation view itself, which carries its own fuller banner — two stacked on one screen is just noise.

#### Test: "shows in every view while a vacation is running"

- **Description**: Verifies the banner is app-level, not panel-level, and counts the days correctly
- **Steps**: Create a vacation covering today at both ends, reload, then open the Insights view
- **Expected Output**: The banner matches `day N of 5` and stays visible inside another panel. The *total* is asserted but not the day index: both range ends come from the same local `dateKey`, while the backend counts in UTC, so near midnight the index can legitimately be a day ahead of the clock the fixtures were built from

#### Test: "is absent when no vacation is running"

- **Description**: Verifies a future trip does not trigger the banner
- **Steps**: Create a vacation starting in ten days, reload
- **Expected Output**: No banner

#### Test: "its Manage button opens the Vacation view"

- **Description**: Verifies the banner's shortcut
- **Steps**: With an active vacation, click "Manage vacation"
- **Expected Output**: The Vacation panel opens

#### Test: "marks the running vacation in the list"

- **Description**: Verifies the panel identifies which stored row is the active one — a regression guard for matching the active vacation by id
- **Steps**: Create a vacation covering today, open the view
- **Expected Output**: The row carries the `--active` modifier, reads "on now", and the panel's own active banner is shown

---

## Test Configuration

- **Testing Framework**: Playwright
- **Test Type**: End-to-End (E2E)
- **Browser**: Tests run in actual browser environments
- **Dates**: All fixtures use the `dateKey(offset)` helper rather than hardcoded days, so the suite is not tied to a calendar date. `dateKey` is **local** while the backend measures vacations in **UTC**, so assertions avoid exact day indices near a date boundary

---

## Summary

These 20 tests comprehensively verify that:

1. ✅ The Vacation view toggles on and off, is exclusive with the other panels, and shows a helpful empty state
2. ✅ Vacations are booked with **both dates inclusive** — a one-day trip is 1 day, and a 10th → 14th trip is 5 days
3. ✅ Overlapping ranges are rejected by the backend and the error is surfaced, not swallowed
4. ✅ Vacations are listed oldest first and can be corrected or deleted afterwards, with the deletion warning explaining what is lost
5. ✅ The re-date list offers exactly the tasks that can be moved — undone one-time dated tasks inside the window — and explains why recurring tasks are absent
6. ✅ A re-date defaults to the first day back and is archived with `vacationMove: true`, so a trip booked in advance is never read as procrastination
7. ✅ An active vacation is visible from every view, names the day count, links to the panel, and is identified correctly in the list

The tests ensure the vacation flow works end to end against the real backend.
