# Calls E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Calls functionality in the Task At Hand application. A call is a person the user must ring **biweekly** (twice a month) or **monthly**. The Calls view is a dedicated page split into a Biweekly and a Monthly section; each person behaves like a simple task without a header — a checkbox marks them called (strikethrough), plus edit and delete (with confirmation). Calls have nothing to do with headers or tasks and never appear in the task views. The backend cron resets the called state for biweekly calls on the 15th and for all calls on the last day of the month.

## Test File Location

`e2e/calls.spec.ts`

## Purpose

These tests verify that users can open the Calls view, see the empty state, add people into the right frequency section, mark them called/not called, edit name and frequency, delete with confirmation, that the data persists across reloads, and that call people never leak into the default task view.

---

## Test Categories

### 1. Calls - Panel (2 tests)

These tests verify the Calls view toggle and empty state.

#### Test: "should show empty state when no calls exist"

- **Description**: Checks that when there are no calls, a helpful message appears
- **Steps**: Open the Calls view with an empty database
- **Expected Output**: The text "No calls yet — add one!" is displayed to guide the user

#### Test: "should toggle calls button pressed state"

- **Description**: Verifies the Calls toolbar button toggles the view on and off
- **Steps**: Click the Calls toggle button, then click it again
- **Expected Output**:
  - After the first click `aria-pressed` is "true", the button gets the active style, and the panel is visible
  - After the second click `aria-pressed` is "false" and the panel is hidden

### 2. Calls - Create (2 tests)

These tests verify call creation through the modal and section placement.

#### Test: "should add a biweekly person into the Biweekly section"

- **Description**: Verifies a user can add a person using the interface, that the Add button is disabled while the name is empty, that Biweekly is the default frequency, and that the person lands in the Biweekly section
- **Steps**: Open the Calls view, click "Add call", observe the Add button is disabled and the Biweekly radio is pre-selected, type "Grandma", click Add
- **Expected Output**:
  - Add is disabled until non-empty text is entered
  - "Grandma" appears in the Biweekly section and not in the Monthly section
  - The empty state message disappears

#### Test: "should add a monthly person into the Monthly section"

- **Description**: Verifies choosing the Monthly frequency places the person in the Monthly section
- **Steps**: Open the add call modal, type "Uncle Raj", select the Monthly radio, click Add
- **Expected Output**: "Uncle Raj" appears in the Monthly section and not in the Biweekly section

### 3. Calls - Mark called (2 tests)

These tests verify the called/not-called checkbox and its done styling.

#### Test: "should mark a person as called"

- **Description**: Clicking the row checkbox marks the person as called with a done/strikethrough style (consistent with how tasks render done state)
- **Steps**: Seed "Grandma" (biweekly) via API; open the Calls view; click "Mark Grandma as called"
- **Expected Output**:
  - The row gets the done modifier class
  - The name gets the strikethrough done class
  - The checkbox shows the checked style

#### Test: "should unmark a called person"

- **Description**: Clicking the checkbox again clears the called state
- **Steps**: Seed "Grandma" via API; mark her as called; click "Mark Grandma as not called"
- **Expected Output**: The row and name lose their done classes

### 4. Calls - Update (2 tests)

These tests verify editing through the pre-filled modal.

#### Test: "should edit a person's name via UI"

- **Description**: Editing reopens the modal pre-filled with the current name
- **Steps**: Seed "Grandma" via API; open her edit modal; verify the input holds the current name; replace it with "Grandmother"; save
- **Expected Output**:
  - The row shows the new name
  - The old name is gone

#### Test: "should move a person to the other section when frequency changes"

- **Description**: Changing the frequency in the edit modal moves the person to the other section
- **Steps**: Seed "Grandma" (biweekly) via API; verify she is in the Biweekly section; open her edit modal; verify the Biweekly radio is pre-selected; select Monthly; save
- **Expected Output**: "Grandma" now appears in the Monthly section and no longer in the Biweekly section

### 5. Calls - Delete (2 tests)

#### Test: "should delete a person with confirmation"

- **Description**: Verifies call deletion asks for confirmation
- **Steps**: Seed "Grandma" via API, click her delete button, confirm
- **Expected Output**:
  - The confirmation text 'Delete call "Grandma"?' is shown
  - After confirming, the empty state message returns

#### Test: "should keep the person when deletion is cancelled"

- **Description**: Ensures cancelling the confirmation leaves the call untouched
- **Steps**: Seed "Grandma" via API, click her delete button, click Cancel
- **Expected Output**: The call row is still visible

### 6. Calls - Persistence (1 test)

#### Test: "should persist calls and called state across reload"

- **Description**: Calls and their called state live in the backend and survive a full page reload
- **Steps**: Add "Grandma" (biweekly) and "Uncle Raj" (monthly) via the UI; mark Grandma as called; reload the page; reopen the Calls view
- **Expected Output**:
  - "Grandma" is still in the Biweekly section and "Uncle Raj" in the Monthly section
  - Grandma still shows the called (done) style; Uncle Raj does not

### 7. Calls - Task view isolation (1 test)

#### Test: "should not show call people in the default task view"

- **Description**: Call people must NEVER appear in the task list views — only on the dedicated Calls page
- **Steps**: Seed a header "Errands" plus calls "Grandma" and "Uncle Raj" via API; reload onto the default task view; then open the Calls view
- **Expected Output**:
  - The default view shows the "Errands" header but neither "Grandma" nor "Uncle Raj"
  - Both people are visible once the Calls view is opened

---

## Test Helpers Used

- `cleanDatabase()`: Removes all headers/tasks to start fresh
- `cleanCalls()`: Removes all calls via API
- `createCall()`: Creates a call via API (fast setup)
- `createHeader()`: Creates a header via API
- `waitForPageLoad()`: Ensures the page is fully loaded before testing

---

## Technology Stack

- **Testing Framework**: Playwright
- **Test Type**: End-to-End (E2E)
- **Browser**: Tests run in actual browser environments

---

## Summary

These 12 tests comprehensively verify that:

1. ✅ The Calls view toggles on and off and shows a helpful empty state
2. ✅ People are added into the correct Biweekly/Monthly section, with validation (Add disabled while empty) and Biweekly as the default frequency
3. ✅ The checkbox marks people called and not called, with a done/strikethrough style
4. ✅ Editing pre-fills the current name and frequency; changing the frequency moves the person to the other section
5. ✅ People can be safely deleted with confirmation
6. ✅ Calls and their called state persist across page reloads
7. ✅ Call people never appear in the default task view

The tests ensure the biweekly/monthly calls flow works end to end against the real backend.
