# Integration E2E Test Documentation

## Overview

This document describes the integration end-to-end (E2E) tests for the Task At Hand application. Unlike unit tests that focus on individual features, these tests verify complex workflows, edge cases, data consistency, and how different parts of the system work together in real-world scenarios.

## Test File Location

`e2e/integration.spec.ts`

## Purpose

These tests ensure the application handles complex user interactions, maintains data consistency across operations, gracefully handles edge cases, and provides a reliable user experience when features are used together.

---

## Test Categories

### 1. Integration - Complete Workflows (4 tests)

These tests verify end-to-end user journeys through multiple features.

#### Test: "should complete full task lifecycle"

- **Description**: A complete journey from creating to deleting a task
- **Steps**:
  1. Create header "Work"
  2. Add task "Complete project" with notes and date ECD (2026-12-31)
  3. Verify task appears with all details
  4. Edit task name to "Submit project" and update notes (using placeholders "Task name" and "Add notes…")
  5. Mark task as done
  6. Verify done state (check icon visible)
  7. Delete task
  8. Verify task is gone
- **Expected Output**: All operations complete successfully in sequence, data remains consistent throughout

#### Test: "should create and manage multiple headers with tasks"

- **Description**: Managing several headers with different tasks
- **Steps**:
  1. Create three headers: Work, Personal, Shopping
  2. Add tasks to each header with visibility verification
  3. Verify tasks are in correct headers
  4. Delete middle header (Personal)
  5. Verify remaining headers maintain their tasks correctly
- **Expected Output**:
  - Work has: "Work Task 1", "Work Task 2"
  - Personal has: "Personal Task 1"
  - Shopping has: "Buy groceries"
  - After deletion, Work and Shopping remain with tasks intact

#### Test: "should handle complex task reordering scenario"

- **Description**: Multiple operations affecting task order
- **Steps**:
  1. Create 4 tasks: "Not done first", "Not done second", "Finished first", "Finished second"
  2. Move "Not done second" up
  3. Mark "Not done second" as done (moves to end)
  4. Mark "Finished first" as undone (moves before other done tasks)
- **Expected Output**:
  - Initial: Not done first, Not done second, Finished first, Finished second
  - After swap: Not done second, Not done first, Finished first, Finished second
  - After marking done: Not done first, Finished first, Finished second, Not done second
  - After marking undone: Not done first, Finished first, Finished second, Not done second

#### Test: "should persist state across page reload"

- **Description**: Data survives browser refresh
- **Steps**:
  1. Create header and tasks
  2. Mark one task as done
  3. Reload the page
- **Expected Output**: All headers, tasks, and done status remain exactly as they were (Task 2, Task 1 with Task 1 showing check icon)

---

### 2. Integration - Edge Cases (9 tests)

These tests verify the app handles unusual or extreme inputs gracefully.

#### Test: "should handle empty header name gracefully"

- **Description**: Can't create header without a name
- **Steps**: Open add header modal, verify button is disabled with empty name
- **Expected Output**: Add button is disabled, modal stays open

#### Test: "should handle empty task name gracefully"

- **Description**: Can't create task without a name
- **Steps**: Open add task modal, verify button is disabled with empty name
- **Expected Output**: Add task button is disabled, modal stays open

#### Test: "should handle very long header names"

- **Description**: App accepts long text input
- **Steps**: Create header with 200 character name
- **Expected Output**: Header is created and displays the full name

#### Test: "should handle very long task names and notes"

- **Description**: App accepts very long content
- **Steps**: Create task with 50-word name and 200-word notes
- **Expected Output**: Task is created with all content

#### Test: "should handle special characters in names"

- **Description**: Input is safely escaped to prevent XSS attacks
- **Steps**: Create header with special characters: `Test & <script>alert('xss')</script> > < "quotes"`
- **Expected Output**: Content is safely displayed, no script execution

#### Test: "should handle rapid consecutive operations"

- **Description**: System handles quick repeated actions
- **Steps**: Rapidly create 5 headers in quick succession
- **Expected Output**: All 5 headers are created successfully

#### Test: "should handle deleting header with many tasks"

- **Description**: Cascade deletion works with large datasets
- **Steps**:
  1. Create header with 20 tasks
  2. Delete the header
- **Expected Output**: Header and all 20 tasks are deleted together

#### Test: "should maintain task isolation between headers after operations"

- **Description**: Operations on one header don't affect others
- **Steps**:
  1. Create two headers with tasks each
  2. Toggle done on Work 1 task
  3. Verify task has done class applied
  4. Verify Personal tasks are unchanged
- **Expected Output**:
  - Work tasks: Work 2, Work 1 (reordered, Work 1 has done class)
  - Personal tasks: Personal 1, Personal 2 (unchanged)

#### Test: "should handle all ECD types in same header"

- **Description**: Different ECD types coexist in one header
- **Steps**: Create tasks with all 5 ECD types in one header
- **Expected Output**: All tasks display correctly with their respective ECD formats:
  - Date: `[ 12/31 ]`
  - Weekly: `↻ Mon`
  - Monthly: `↻ 1st`
  - Yearly: `↻ 1/1/2027`
  - None: `[ No date ]`

---

### 3. Integration - Modal Interactions (3 tests)

These tests verify complex modal interaction patterns.

#### Test: "should allow switching between modals without issues"

- **Description**: Opening and closing different modals in sequence
- **Steps**:
  1. Open add task modal, close it, wait 200ms
  2. Open edit header modal, close it, wait 200ms
  3. Open add header modal, create header, wait 200ms
- **Expected Output**: All modals work correctly, no state leakage between them

#### Test: "should handle opening and canceling multiple modals in sequence"

- **Description**: Repeated cancel operations don't break functionality
- **Steps**:
  1. Open and cancel edit modal 3 times
  2. Then actually edit the task using placeholder "Task name"
- **Expected Output**: Task can still be edited successfully after multiple cancels

#### Test: "should handle confirming delete modals correctly"

- **Description**: Multiple delete operations with different choices
- **Steps**:
  1. Try to delete Task 1, but cancel
  2. Actually delete Task 2 — Task 2 is undone, so the confirm modal requires a
     deletion reason; fill it before confirming (Delete stays disabled otherwise)
- **Expected Output**:
  - Task 1 still exists (was canceled)
  - Task 2 is deleted (was confirmed)

---

### 4. Integration - Data Consistency (2 tests)

These tests ensure data integrity across complex operations.

#### Test: "should maintain priority consistency after multiple operations"

- **Description**: Complex sequence maintains correct order
- **Steps**:
  1. Create 4 tasks: Task A, Task B, Task C, Task D
  2. Mark Task B as done, verify done class, wait 500ms
  3. Move Task C up, wait 500ms
  4. Mark Task D as done, verify done class, wait 500ms
  5. Delete Task D
- **Expected Output**: Final order is Task C, Task A, Task B (consistent and logical)

#### Test: "should handle task priority after changing done status multiple times"

- **Description**: Toggling done/undone repeatedly maintains order
- **Steps**:
  1. Create Task 1, Task 2, Task 3
  2. Toggle Task 2 done → moves to end
  3. Toggle Task 2 undone → stays at end
  4. Toggle Task 2 done again → stays at end
- **Expected Output**:
  - After operations: Task 1, Task 3, Task 2
  - Order is stable after multiple toggles

---

### 5. Integration - UI Responsiveness (3 tests)

These tests verify the user interface responds appropriately.

#### Test: "should show loading state briefly on page load"

- **Description**: Users see feedback while app loads
- **Steps**: Navigate to fresh page
- **Expected Output**:
  - "Loading…" message appears initially
  - Transitions to content when ready

#### Test: "should update UI immediately after operations"

- **Description**: Changes appear instantly without refresh
- **Steps**:
  1. Add task
  2. Edit task using "Task name" placeholder
- **Expected Output**: Both operations show results immediately

#### Test: "should handle error state gracefully"

- **Description**: Network errors show helpful messages
- **Steps**:
  1. Block API requests
  2. Try to add task
- **Expected Output**: Error message "Action failed" appears

---

## Common Integration Patterns Tested

### 1. **Complete User Workflows**

- Creating → Viewing → Editing → Completing → Deleting
- Multiple related operations in realistic sequences
- State persistence across page reloads

### 2. **Cross-Feature Interactions**

- Headers and tasks working together
- Multiple headers with isolated tasks
- Different ECD types coexisting

### 3. **Edge Cases & Boundaries**

- Empty inputs
- Very long inputs
- Special characters
- Rapid operations
- Large datasets

### 4. **Data Integrity**

- Correct ordering after complex operations
- Isolation between different data groups
- Cascade deletions
- State consistency

### 5. **User Experience**

- Loading states
- Error messages
- Immediate UI updates
- Modal state management

---

## Test Setup

### Before Each Test

- **Database Cleanup**: All data cleared for fresh start
- **Page Load**: Application loads at root URL "/"
- **Wait**: Page fully ready before tests begin

### Helper Functions Used

- `cleanDatabase()`: Removes all data
- `createHeader()`, `createTask()`: Fast API-based setup
- `addHeaderViaUI()`, `addTaskViaUI()`: UI-based creation
- `deleteHeaderViaUI()`, `deleteTaskViaUI()`: UI-based deletion
- `toggleTaskDone()`: Toggle completion status
- `getTask()`: Get task element
- `getTaskNamesInHeader()`: Get all task names in a header
- `getHeaderNames()`: Get all header names
- `waitForPageLoad()`: Ensure app is ready

---

## Technology Stack

- **Testing Framework**: Playwright
- **Test Type**: Integration E2E
- **Browser**: Tests run in actual browser environments

---

## Summary

These 21 integration tests comprehensively verify that:

1. ✅ **Complete workflows function end-to-end**
   - Full task lifecycle from creation to deletion
   - Multi-header management
   - Complex reordering scenarios

2. ✅ **Edge cases are handled gracefully**
   - Empty inputs rejected
   - Long content accepted
   - Special characters safely escaped
   - Rapid operations processed correctly

3. ✅ **Data consistency is maintained**
   - Priority ordering remains logical
   - Task isolation between headers
   - State persists across reloads
   - Cascade deletions work properly

4. ✅ **Modal interactions are robust**
   - Multiple modals can be used in sequence
   - Cancel operations don't break state
   - Delete confirmations work correctly

5. ✅ **UI provides good user experience**
   - Loading states appear
   - Updates happen immediately
   - Errors show helpful messages
   - All features work together smoothly

6. ✅ **Real-world usage patterns work**
   - Multiple concurrent operations
   - Different feature combinations
   - Complex user journeys
   - Large datasets

These integration tests ensure that the Task At Hand application is robust, reliable, and provides a smooth user experience even in complex real-world usage scenarios.
