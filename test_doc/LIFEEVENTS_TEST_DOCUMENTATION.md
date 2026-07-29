# Life Events E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Life Events functionality in the Task At Hand application. A life event is a date that recurs **annually** (like "Wife's birthday" on March 7), stored as a `"D/M"` string with no year. The backend cron connects it to the todo: every year on the event's day it creates a one-time date task named after the event under a header named **"Events"** (reused case-insensitively, created otherwise) and links it via `todoTaskId`. The sync works both ways: toggling done on either side flips the other, deleting the todo task unlinks the event (without completing it), and when the nightly cron deletes the completed todo task the life event is marked done and kept — it is never deleted from Life Events and fires again on its next anniversary.

## Test File Location

`e2e/lifeevents.spec.ts`

## Purpose

These tests verify that users can create, edit, reorder, complete and delete life events from the Life Events panel; that the annual date pickers behave (including the Feb/short-month clamp); and that the cron round-trip works — a due event lands in the todo under "Events", completing the todo task marks the event done, and the next cron run cleans the todo without deleting the event.

---

## Test Categories

### 1. Life Events - Panel (2 tests)

These tests verify the Life Events view toggle and empty state.

#### Test: "should show empty state when no life events exist"

- **Description**: Checks that when there are no life events, a helpful message appears
- **Steps**: Open the Life Events view with an empty database
- **Expected Output**: The text "No life events yet — add one!" is displayed to guide the user

#### Test: "should toggle life events button pressed state"

- **Description**: Verifies the Life Events toolbar button toggles the view on and off
- **Steps**: Click the Life Events toggle button, then click it again
- **Expected Output**:
  - After the first click `aria-pressed` is "true", the button gets the active style, and the panel is visible
  - After the second click `aria-pressed` is "false" and the panel is hidden

### 2. Life Events - CRUD (7 tests)

These tests verify creating, editing, reordering, completing and deleting life events in the panel.

#### Test: "should create a life event via UI"

- **Description**: Verifies a user can create a life event with the month/day pickers
- **Steps**: Open the Life Events view, click "Add Life Event", enter "Wife's birthday", pick March and 7, submit
- **Expected Output**: A row appears with the name and the "↻ 7 Mar" date badge; the API stores `date: "7/3"`, `done: false`, `todoTaskId: null`

#### Test: "should disable Add until a name is entered"

- **Description**: The confirm button requires a non-empty name
- **Steps**: Open the add modal; check the Add button before and after typing a name
- **Expected Output**: Add is disabled with an empty name and enabled once a name is typed

#### Test: "should edit a life event's name and date via UI"

- **Description**: Verifies the edit modal updates both the name and the annual date
- **Steps**: Create "Anniversery" on 25/12 via API, open the edit modal, fix the name to "Anniversary" and pick November 20, save
- **Expected Output**: The row shows the corrected name with the "↻ 20 Nov" badge

#### Test: "should clamp the day when switching to a shorter month"

- **Description**: The day picker never allows a day the selected month can't have (Feb tops out at 29 — the backend cron fires Feb 29 events on Feb 28 in non-leap years)
- **Steps**: In the add modal pick January 31, then switch the month to February
- **Expected Output**: The day select drops to 29; saving produces the "↻ 29 Feb" badge

#### Test: "should delete a life event via UI"

- **Description**: Verifies deletion with the confirm modal
- **Steps**: Create an event via API, click its delete button, confirm
- **Expected Output**: The panel returns to the empty state and `GET /lifeevents` is empty

#### Test: "should reorder life events with the move buttons"

- **Description**: Life events carry a contiguous 0-based priority like projects; the arrows move a row
- **Steps**: Create "First" and "Second" via API, click "Move life event Second up"
- **Expected Output**: The row order flips to Second, First in the UI and `GET /lifeevents` returns them in that order

#### Test: "should toggle done from the panel (no linked task)"

- **Description**: The done checkbox works even when no todo task is linked (out of season)
- **Steps**: Create an event via API, click its checkbox, then click it again
- **Expected Output**: The name gains the strikethrough done style, then loses it

### 3. Life Events - Cron & todo sync (3 tests)

These tests verify the cron round-trip and the todo-side sync. They hit the real `/cron/run` endpoint (with `skipInsights`).

#### Test: "cron adds a due life event to the todo under an Events header and completes the loop"

- **Description**: The full annual cycle in one test: create → cron adds to todo → complete in todo → cron cleans up, event retained
- **Steps**: Create a life event dated today (UTC) via API; run the cron; check the todo and panel; toggle the todo task done; run the cron again
- **Expected Output**:
  - First run reports `lifeEventTasksCreated: 1`; an "Events" header holds a task named after the event; the panel row shows the "in todo" badge
  - Toggling the todo task done marks the life event done (client sync)
  - Second run reports `lifeEventsCompleted: 1` and `lifeEventTasksCreated: 0` (a same-day rerun cannot re-add); the done task and the emptied "Events" header are gone from the todo, but the life event remains, `done: true` with `todoTaskId: null`

#### Test: "cron ignores life events not due today"

- **Description**: An event whose day/month is not today is untouched by the cron
- **Steps**: Create a life event dated a week from now; run the cron
- **Expected Output**: `lifeEventTasksCreated: 0`, no "Events" header appears, and the panel row shows no "in todo" badge

#### Test: "deleting the linked todo task unlinks the life event but keeps it"

- **Description**: Deleting the todo task is not completing it — the event survives, unlinked and not done
- **Steps**: Create a life event dated today; run the cron; delete the created todo task via the UI (with a reason); open the panel
- **Expected Output**: The event row is still listed without the "in todo" badge; the API shows `todoTaskId: null` and `done: false`

---

## Summary

| Category                      | Tests  |
| ----------------------------- | ------ |
| Life Events - Panel           | 2      |
| Life Events - CRUD            | 7      |
| Life Events - Cron & todo sync | 3     |
| **Total**                     | **12** |
