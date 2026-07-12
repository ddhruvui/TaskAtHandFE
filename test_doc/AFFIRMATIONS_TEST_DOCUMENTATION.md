# Affirmations E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Affirmations functionality in the Task At Hand application. An affirmation is a single short line the user reads daily (e.g. "Thank you blessing"). The Affirmations view is a flat list — sorted by creation time — with add, edit, and delete (with confirmation). Affirmations have nothing to do with headers or tasks.

## Test File Location

`e2e/affirmations.spec.ts`

## Purpose

These tests verify that users can open the Affirmations view, see the empty state, and create, edit, and delete affirmations through the UI.

---

## Test Categories

### 1. Affirmations - Panel (3 tests)

These tests verify the Affirmations view toggle, empty state, and list ordering.

#### Test: "should show empty state when no affirmations exist"

- **Description**: Checks that when there are no affirmations, a helpful message appears
- **Steps**: Open the Affirmations view with an empty database
- **Expected Output**: The text "No affirmations yet — add one!" is displayed to guide the user

#### Test: "should toggle affirmations button pressed state"

- **Description**: Verifies the Affirmations toolbar button toggles the view on and off
- **Steps**: Click the Affirmations toggle button, then click it again
- **Expected Output**:
  - After the first click `aria-pressed` is "true", the button gets the active style, and the panel is visible
  - After the second click `aria-pressed` is "false" and the panel is hidden

#### Test: "should list affirmations in creation order"

- **Description**: Confirms the list renders in `createdAt` ascending order (the backend's sort)
- **Steps**: Seed two affirmations via API ("Thank you blessing" then "I am enough"); open the Affirmations view
- **Expected Output**: The rows appear in creation order: "Thank you blessing", then "I am enough"

### 2. Affirmations - Create (4 tests)

These tests verify affirmation creation through the modal.

#### Test: "should create an affirmation via UI"

- **Description**: Verifies a user can create an affirmation using the interface, and that the Add button is disabled while the input is empty
- **Steps**: Open the Affirmations view, click "Add affirmation", observe the Add button is disabled, type "Thank you blessing", click Add
- **Expected Output**:
  - Add is disabled until non-empty text is entered
  - A new row with "Thank you blessing" appears
  - The empty state message disappears

#### Test: "should create an affirmation by pressing Enter"

- **Description**: Verifies the keyboard shortcut for submitting the modal
- **Steps**: Open the add affirmation modal, type "I am enough", press Enter in the input
- **Expected Output**: The modal closes and the new row appears in the list

#### Test: "should cancel the add affirmation modal"

- **Description**: Checks that clicking Cancel dismisses the creation form without saving
- **Steps**: Open the add affirmation modal, enter text, click Cancel
- **Expected Output**: The modal closes and the empty state message is still shown

#### Test: "should close the add affirmation modal on Escape"

- **Description**: Verifies keyboard shortcut for closing the modal
- **Steps**: Open the add affirmation modal, press Escape in the input
- **Expected Output**: The modal closes without creating an affirmation

### 3. Affirmations - Update (1 test)

#### Test: "should edit an affirmation via UI"

- **Description**: Editing reopens the modal pre-filled with the current text
- **Steps**: Seed "Thank you blessing" via API; open its edit modal; verify the input holds the current text; replace it with "Thank you for this day"; save
- **Expected Output**:
  - The row shows the new text
  - The old text is gone

### 4. Affirmations - Delete (2 tests)

#### Test: "should delete an affirmation with confirmation"

- **Description**: Verifies affirmation deletion asks for confirmation
- **Steps**: Seed an affirmation, click its delete button, confirm
- **Expected Output**:
  - The confirmation text 'Delete affirmation "Thank you blessing"?' is shown
  - After confirming, the empty state message returns

#### Test: "should keep the affirmation when deletion is cancelled"

- **Description**: Ensures cancelling the confirmation leaves the affirmation untouched
- **Steps**: Seed an affirmation, click its delete button, click Cancel
- **Expected Output**: The affirmation row is still visible

---

## Test Helpers Used

- `cleanDatabase()`: Removes all headers/tasks to start fresh
- `cleanAffirmations()`: Removes all affirmations via API
- `createAffirmation()`: Creates an affirmation via API (fast setup)
- `waitForPageLoad()`: Ensures the page is fully loaded before testing

---

## Technology Stack

- **Testing Framework**: Playwright
- **Test Type**: End-to-End (E2E)
- **Browser**: Tests run in actual browser environments

---

## Summary

These 10 tests comprehensively verify that:

1. ✅ The Affirmations view toggles on and off and shows a helpful empty state
2. ✅ Affirmations are listed in creation order
3. ✅ Affirmations can be created via the modal (button or Enter), with validation (Add disabled while empty) and cancel/Escape paths
4. ✅ Editing pre-fills the current text and saves the new one
5. ✅ Affirmations can be safely deleted with confirmation

The tests ensure the daily-affirmations flow works end to end against the real backend.
