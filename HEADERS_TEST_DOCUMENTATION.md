# Headers E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Headers functionality in the Task At Hand application. Headers are organizational containers that group related tasks together (like "Work", "Personal", "Shopping", etc.).

## Test File Location

`e2e/headers.spec.ts`

## Purpose

These tests verify that users can successfully create, view, edit, reorder, and delete headers through the user interface. The tests ensure the header management system works correctly from a user's perspective.

---

## Test Categories

### 1. Headers - Create (10 tests)

These tests verify that users can successfully create new headers and that the creation interface works properly.

#### Test: "should show empty state when no headers exist"

- **Description**: Checks that when the app has no headers, a helpful message appears
- **Steps**: Load the application with an empty database
- **Expected Output**: The text "No headers yet — add one!" is displayed to guide the user

#### Test: "should create a new header via UI"

- **Description**: Verifies a user can create a header using the interface
- **Steps**: Click "Add header" button, enter "Work", submit
- **Expected Output**:
  - A new header titled "Work" appears on the page
  - The empty state message disappears

#### Test: "should create multiple headers in sequence"

- **Description**: Confirms users can add several headers one after another
- **Steps**: Create three headers: "Work", "Personal", and "Shopping"
- **Expected Output**: All three headers appear in the order they were created

#### Test: "should focus input and clear on open modal"

- **Description**: Ensures the input field is ready for typing when the modal opens
- **Steps**: Click "Add header" button
- **Expected Output**:
  - The cursor automatically appears in the input field (focused)
  - The input field is empty and ready for new text

#### Test: "should close modal on cancel"

- **Description**: Checks that clicking Cancel dismisses the header creation form
- **Steps**: Open the add header modal, click Cancel
- **Expected Output**: The modal closes and the input field disappears

#### Test: "should close modal on Escape key"

- **Description**: Verifies keyboard shortcut for closing the modal
- **Steps**: Open the add header modal, press Escape key
- **Expected Output**: The modal closes without creating a header

#### Test: "should close modal on overlay click"

- **Description**: Tests that clicking outside the modal closes it
- **Steps**: Open the modal, click on the dark background area outside the form
- **Expected Output**: The modal closes

#### Test: "should submit on Enter key"

- **Description**: Checks keyboard shortcut for creating a header
- **Steps**: Open modal, type "Work", press Enter
- **Expected Output**: The header "Work" is created without needing to click a button

#### Test: "should disable submit button when name is empty"

- **Description**: Prevents creating headers with blank names
- **Steps**:
  1. Open modal (input is empty)
  2. Type "Work" in the input field
- **Expected Output**:
  - Add button is disabled when input is empty
  - Add button becomes enabled once text is entered

#### Test: "should trim whitespace from header name"

- **Description**: Ensures extra spaces don't affect the saved header name
- **Steps**: Create a header with " Work " (spaces before and after)
- **Expected Output**: The header appears as "Work" without the extra spaces

---

### 2. Headers - Read (2 tests)

These tests verify that headers display correctly and show appropriate information.

#### Test: "should display headers in priority order"

- **Description**: Confirms headers appear in the order they were created
- **Steps**: Create three headers, reload the page
- **Expected Output**: Headers appear in the same order: "Work", "Personal", "Shopping"

#### Test: "should show empty task state for header without tasks"

- **Description**: Checks that new headers show a helpful message when they have no tasks
- **Steps**: Create a header named "Work"
- **Expected Output**: Under the "Work" header, text appears saying "No tasks yet — add one!"

---

### 3. Headers - Update (6 tests)

These tests verify that users can edit header names and change their order (priority).

#### Test: "should edit header name"

- **Description**: Allows users to rename an existing header
- **Steps**:
  1. Create a header "Work"
  2. Click the edit button
  3. Change the name to "Office"
  4. Click Save
- **Expected Output**:
  - The header now shows "Office" instead of "Work"
  - The old name "Work" is no longer visible

#### Test: "should select all text when editing header"

- **Description**: Makes editing easier by auto-selecting the existing text
- **Steps**:
  1. Create header "Work"
  2. Click edit button
  3. Immediately start typing "Office"
- **Expected Output**:
  - The old text is automatically replaced (not appended)
  - Header shows "Office"

#### Test: "should move header up in priority"

- **Description**: Users can reorder headers by moving them up
- **Steps**:
  1. Create three headers: "Work", "Personal", "Shopping"
  2. Move "Personal" up using the up arrow button
- **Expected Output**:
  - Headers now appear in order: "Personal", "Work", "Shopping"
  - "Personal" has moved from 2nd position to 1st position

#### Test: "should move header down in priority"

- **Description**: Users can reorder headers by moving them down
- **Steps**:
  1. Create three headers: "Work", "Personal", "Shopping"
  2. Move "Personal" down using the down arrow button
- **Expected Output**:
  - Headers now appear in order: "Work", "Shopping", "Personal"
  - "Personal" has moved from 2nd position to 3rd position

#### Test: "should disable up button for first header"

- **Description**: Prevents trying to move the first header higher
- **Steps**: Create two headers "Work" and "Personal"
- **Expected Output**: The "Move up" button on "Work" (first header) is disabled/grayed out

#### Test: "should disable down button for last header"

- **Description**: Prevents trying to move the last header lower
- **Steps**: Create two headers "Work" and "Personal"
- **Expected Output**: The "Move down" button on "Personal" (last header) is disabled/grayed out

---

### 4. Headers - Delete (5 tests)

These tests verify that headers can be safely deleted with proper confirmation.

#### Test: "should delete header via UI"

- **Description**: Users can remove headers they no longer need
- **Steps**:
  1. Create a header "Work"
  2. Click the delete button
  3. Confirm the deletion
- **Expected Output**:
  - The "Work" header disappears
  - The empty state message "No headers yet — add one!" reappears

#### Test: "should show confirmation modal before deleting"

- **Description**: Prevents accidental deletions by asking for confirmation
- **Steps**:
  1. Create header "Work"
  2. Click the delete button
- **Expected Output**: A popup appears asking 'Delete header "Work" and all its tasks?' before actually deleting

#### Test: "should cancel delete on cancel button"

- **Description**: Users can change their mind about deleting
- **Steps**:
  1. Create header "Work"
  2. Click delete button
  3. Click Cancel in the confirmation dialog
- **Expected Output**: The header "Work" remains visible (not deleted)

#### Test: "should delete multiple headers"

- **Description**: Confirms the delete function works repeatedly
- **Steps**:
  1. Create three headers: "Work", "Personal", "Shopping"
  2. Delete "Personal"
- **Expected Output**: Only "Work" and "Shopping" remain

#### Test: "should maintain priority order after deletion"

- **Description**: Ensures deleting a header doesn't scramble the order of remaining headers
- **Steps**:
  1. Create four headers: "First", "Second", "Third", "Fourth"
  2. Delete "Second"
- **Expected Output**: Remaining headers appear in order: "First", "Third", "Fourth"

---

### 5. Headers - Error Handling (1 test)

This test verifies the app handles connection problems gracefully.

#### Test: "should show error when backend is unavailable"

- **Description**: When the server is down, show a helpful error message
- **Steps**: Block all API requests to simulate a server outage, then load the page
- **Expected Output**:
  - Error message appears: "Failed to load"
  - Helpful hint appears: "Is the backend running?"

---

## Test Setup

### Before Each Test

- **Database Cleanup**: The database is wiped clean to ensure each test starts fresh
- **Page Load**: The app is loaded and ready before each test begins
- **URL**: Tests run against the root URL "/"

### Helper Functions Used

- `cleanDatabase()`: Removes all data to start fresh
- `createHeader()`: Creates a header via API (fast setup)
- `addHeaderViaUI()`: Creates a header through the user interface
- `deleteHeaderViaUI()`: Deletes a header through the user interface
- `getHeaderNames()`: Gets a list of all header names in order
- `waitForPageLoad()`: Ensures the page is fully loaded before testing

---

## Technology Stack

- **Testing Framework**: Playwright
- **Test Type**: End-to-End (E2E)
- **Browser**: Tests run in actual browser environments

---

## Summary

These 24 tests comprehensively verify that:

1. ✅ Headers can be created with proper validation
2. ✅ Headers display correctly with appropriate empty states
3. ✅ Headers can be renamed and reordered
4. ✅ Headers can be safely deleted with confirmation
5. ✅ The UI handles errors gracefully when the backend is unavailable
6. ✅ All keyboard shortcuts and UI interactions work as expected
7. ✅ The application prevents invalid operations (like moving first header up)

The tests ensure a reliable and user-friendly header management experience.
