# On-call E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the On-call view in the Task At Hand application. An on-call shift is a date plus a local start–end time and a type — **primary** (the default, drawn solid red) or **secondary** (a dashed red outline). On-call is **recorded separately and never affects tasks**: the backend cron, archive, stats and insights never read it, apart from cron step 12 deleting shifts that have ended.

The view is one **agenda** of upcoming shifts with the off-call gaps between them — "Not on call from Mon 11/16 22:00 to Tue 11/24 09:00 · 7d 11h" — instead of paging through weeks. Back-to-back or overlapping shifts are one stretch of cover (no gap inside it); when no shift is running the agenda opens with "Not on call now · until …", and it closes with "Nothing scheduled after …". Gap wording comes from `formatMoment`/`formatSpan` in `src/utils/oncall.ts`, which the spec imports so assertions follow the app. Shifts are added through a dialog whose quick-add field takes the shorthand `M/D start-end`, with a trailing `s` for secondary. A shift that is running right now shows a banner in every view.

## Test File Location

`e2e/oncall.spec.ts`

## Purpose

These tests verify that users can open the On-call view, add shifts with the quick-add shorthand (primary by default, secondary with `s`), see overnight shifts marked "+1", read the off-call gaps between shifts, get the backend's overlap rejection surfaced, edit and delete shifts, see a running shift from every view, and that none of this ever touches the todo.

---

## Test Categories

### 1. Navigation and empty state (2 tests)

#### Test: "shows the empty message with no shifts"

- **Description**: With no shifts stored, the view explains what on-call is for
- **Steps**: Open the On-call view with an empty `OnCalls` collection
- **Expected Output**: "No upcoming on-call shifts — add one!" is visible

#### Test: "the toggle is exclusive with the other panels"

- **Description**: On-call behaves like every other panel toggle
- **Steps**: Open On-call, then click the Vacation toggle
- **Expected Output**: The on-call panel is hidden and the vacation panel is shown

### 2. Adding shifts (3 tests)

#### Test: "quick add creates a primary shift by default"

- **Description**: The user's own shorthand creates a primary shift
- **Steps**: Click "Add on-call shift", type `M/D 9-22` for three days ahead, click Add
- **Expected Output**: The preview reads "09:00 → 22:00 · 13h · primary"; one row appears with the primary class and "09:00 – 22:00"; the API returns that shift with `type: "primary"`

#### Test: "a trailing s makes the shift secondary"

- **Description**: The `s` suffix selects the secondary type
- **Steps**: Type `M/D 10-18 s` in quick add, click Add
- **Expected Output**: The Secondary radio is checked; the row has the secondary class and a "secondary" pill

#### Test: "an overnight shift shows +1 and frees up the next morning"

- **Description**: A shift past midnight is one record that ends on the next day
- **Steps**: Create a `22:00`–`06:00` primary shift two days out via the API, open the view
- **Expected Output**: The row shows "+1"; the closing line reads "Nothing scheduled after" the next day's 06:00 (e.g. "Thu 11/12 06:00")

### 3. Agenda and gaps (5 tests)

#### Test: "shows the gap between shifts as 'Not on call from … to …'"

- **Description**: The time between two shifts is spelled out instead of paged through by week
- **Steps**: Create `09:00`–`22:00` in two days and `09:00`–`17:00` in ten days via the API, open the view
- **Expected Output**: Two `.oncall-panel__gap` rows (the "now" gap and the one between); the second reads "Not on call", "from <day+2> 22:00 to <day+10> 09:00" and "7d 11h"; the agenda order is now-gap, shift, gap, shift

#### Test: "opens with 'Not on call now' when no shift is running"

- **Description**: The user's current free time leads the agenda
- **Steps**: Create a shift three days out, open the view
- **Expected Output**: The first agenda item has `oncall-panel__gap--now` and reads "Not on call now" "until <day+3> 09:00"

#### Test: "back-to-back shifts leave no gap between them"

- **Description**: Cover that runs unbroken across two shifts has no gap inside it
- **Steps**: Create `09:00`–`17:00` primary and `17:00`–`22:00` secondary on the same day, open the view
- **Expected Output**: Two shift rows and a single gap — the "now" one

#### Test: "a running shift opens the agenda without a 'now' gap"

- **Description**: While on call the agenda starts with the running shift
- **Steps**: Create a `00:00`–`24:00` shift for today, open the view
- **Expected Output**: The first item is the shift row with `oncall-panel__row--active` and the "now" pill; no `oncall-panel__gap--now`

#### Test: "has no week paging"

- **Description**: The week timeline and its ‹ › arrows are gone
- **Steps**: Create a shift, open the view
- **Expected Output**: No "Next week" / "Previous week" buttons

### 4. Validation, editing and deleting (3 tests)

#### Test: "shows an overlap error from the server"

- **Description**: The backend's overlap rule is surfaced, not swallowed
- **Steps**: Create `09:00`–`22:00` via the API, then add `20-23` on the same day through the dialog
- **Expected Output**: "Action failed: Shift overlaps…" is visible

#### Test: "edits a shift's type"

- **Description**: A primary shift can be switched to secondary
- **Steps**: Click the shift's edit button, choose Secondary, click Save
- **Expected Output**: The row now carries the secondary class

#### Test: "deletes a shift after confirming"

- **Description**: Deletion goes through the shared confirm dialog
- **Steps**: Click the shift's delete button and confirm
- **Expected Output**: No rows remain and the API returns an empty list

### 5. Banner and isolation (2 tests)

#### Test: "a running shift shows the banner in every view"

- **Description**: A shift running now is visible from the todo list and stays visible in the On-call view
- **Steps**: Create a `00:00`–`24:00` shift for today, reload, click "Manage on-call"
- **Expected Output**: The banner reads "Primary on call now"; the On-call view opens with the banner still shown

#### Test: "on-call never touches tasks"

- **Description**: Adding and deleting shifts leaves the todo alone
- **Steps**: Create a header and task, create a shift, delete the shift through the UI
- **Expected Output**: The header still holds exactly the "Ship it" task

---

## Summary

These 15 tests verify that:

1. ✅ The On-call view toggles like every other panel and shows a helpful empty state
2. ✅ The quick-add shorthand creates a **primary** shift by default and a **secondary** one with `s`
3. ✅ Overnight shifts are one record, marked "+1", ending the next morning
4. ✅ The agenda spells out the off-call gaps ("Not on call from … to …", with the span), opens with "Not on call now" when free, keeps back-to-back cover unbroken, and has no week paging
5. ✅ The backend's overlap rejection is shown to the user
6. ✅ Shifts can be retyped and deleted
7. ✅ A running shift is visible from every view
8. ✅ On-call never changes a task

The tests run against the real backend (`USE_TEST_DB=true`).
