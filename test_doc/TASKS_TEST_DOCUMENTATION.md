# Tasks E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the Tasks functionality in the Task At Hand application. Tasks are individual to-do items that belong to Headers and can have names, notes, completion status, priority ordering, and Expected Completion Dates (ECDs).

## Test File Location

`e2e/tasks.spec.ts`

## Purpose

These tests verify that users can create, view, edit, reorder, toggle completion status, and delete tasks through the user interface. The tests ensure tasks work correctly within their headers and handle various types of completion dates.

---

## Test Categories

### 1. Tasks - Create (12 tests)

These tests verify that users can create new tasks with various configurations.

#### Test: "should create a new task via UI"

- **Description**: Verifies basic task creation through the interface
- **Steps**:
  1. Create a header "Work"
  2. Click add task button
  3. Enter "Write report"
  4. Submit
- **Expected Output**: The task "Write report" appears under the Work header

#### Test: "should create task with notes"

- **Description**: Confirms tasks can include additional notes
- **Steps**:
  1. Create header
  2. Add task with name "Write report" and notes "Include Q1 data"
- **Expected Output**: Task appears with notes visible below the name

#### Test: "should create task with date ECD"

- **Description**: Tasks can have a one-time date as completion target
- **Steps**:
  1. Open add task modal
  2. Enter name "Write report"
  3. Select "Date" mode
  4. Choose date 2026-06-15
- **Expected Output**: Task displays "[ 06/15 ]" showing the target date

#### Test: "should create task with weekly ECD"

- **Description**: Tasks can recur on specific days of the week
- **Steps**:
  1. Enter name "Team meeting"
  2. Select "Weekly" mode
  3. Choose Mon and Fri
- **Expected Output**: Task displays "↻ Fri Mon" showing recurring days

#### Test: "should create task with monthly ECD"

- **Description**: Tasks can recur on specific days of each month
- **Steps**:
  1. Enter name "Monthly review"
  2. Select "Monthly" mode
  3. Choose 1st and 15th
- **Expected Output**: Task displays "↻ 1st 15th" showing recurring monthly days

#### Test: "should create task with yearly ECD"

- **Description**: Tasks can recur on a specific date each year
- **Steps**:
  1. Enter name "Birthday"
  2. Select "Yearly" mode
  3. Enter date 25/12/2026
- **Expected Output**: Task displays "↻ 25/12/2026" showing annual recurrence

#### Test: "should focus task name input when modal opens"

- **Description**: Makes it easy to start typing immediately
- **Steps**: Click "Add task" button
- **Expected Output**: The cursor is automatically in the task name field

#### Test: "should close modal on cancel"

- **Description**: Users can dismiss the modal without creating a task
- **Steps**: Open add task modal, click Cancel
- **Expected Output**: Modal closes, no task created

#### Test: "should close modal on Escape key"

- **Description**: Keyboard shortcut to close the modal
- **Steps**: Open modal, press Escape key
- **Expected Output**: Modal closes

#### Test: "should submit on Enter key"

- **Description**: Quick keyboard shortcut to create task
- **Steps**: Enter task name, press Enter
- **Expected Output**: Task is created without clicking the button

#### Test: "should disable submit when name is empty"

- **Description**: Prevents creating tasks without names
- **Steps**:
  1. Open modal (name field empty)
  2. Type a name
- **Expected Output**:
  - Add button disabled when empty
  - Add button enabled when name is entered

---

### 2. Tasks - Read (5 tests)

These tests verify that tasks display correctly with their information.

#### Test: "should display tasks in priority order"

- **Description**: Tasks appear in the order they were created
- **Steps**: Create three tasks in sequence
- **Expected Output**: Tasks appear in order: "Task 1", "Task 2", "Task 3"

#### Test: "should display undone tasks before done tasks"

- **Description**: Incomplete tasks are shown before completed ones
- **Steps**: Create mix of done and undone tasks
- **Expected Output**: All undone tasks appear first, then done tasks

#### Test: "should show task with notes"

- **Description**: Notes appear below task name with arrow indicator
- **Steps**: Create task with notes "Include Q1 data"
- **Expected Output**:
  - Task shows "=>" indicator
  - Notes text is visible

#### Test: "should show ECD date correctly"

- **Description**: One-time dates display in short format
- **Steps**: Create task with date ECD 2026-06-15
- **Expected Output**: Task shows "[ 06/15 ]"

#### Test: "should show recurring ECD with special icon"

- **Description**: Recurring dates show with rotation symbol
- **Steps**: Create task with weekly ECD (Mon, Wed)
- **Expected Output**: Task shows "↻ Mon Wed"

---

### 3. Tasks - Update Toggle Done (4 tests)

These tests verify the completion status toggle functionality.

#### Test: "should toggle task to done"

- **Description**: Marking a task complete changes its appearance
- **Steps**: Click the checkbox on an undone task
- **Expected Output**:
  - Task card gets "done" styling
  - Checkmark icon appears

#### Test: "should toggle task to undone"

- **Description**: Can un-complete a task
- **Steps**: Click checkbox on a done task
- **Expected Output**: Task returns to normal styling, checkmark disappears

#### Test: "should move task to end when marked done"

- **Description**: Completed tasks automatically move to the bottom
- **Steps**:
  1. Have three tasks: Task 1, Task 2, Task 3
  2. Mark Task 1 as done
- **Expected Output**: Order becomes: Task 2, Task 3, Task 1

#### Test: "should move task before done tasks when marked undone"

- **Description**: Un-completing a task moves it back to the active section
- **Steps**:
  1. Have Task 1 (undone), Task 2 (done), Task 3 (done)
  2. Mark Task 2 as undone
- **Expected Output**: Task 2 moves before Task 3 in the list

---

### 4. Tasks - Update Edit (6 tests)

These tests verify editing task details.

#### Test: "should edit task name and notes"

- **Description**: Users can update task information
- **Steps**:
  1. Click edit button on task
  2. Change name to "Submit report"
  3. Change notes to "New notes"
  4. Save
- **Expected Output**: Task shows updated name and notes

#### Test: "should edit task ECD"

- **Description**: Can change the completion date type
- **Steps**:
  1. Edit task with date ECD
  2. Switch to "Weekly" mode
  3. Select Mon
- **Expected Output**: Task now shows "↻ Mon" instead of date

#### Test: "should clear ECD by selecting None"

- **Description**: Can remove the completion date
- **Steps**:
  1. Edit task with a date
  2. Select "None" mode
  3. Save
- **Expected Output**: Task shows "[ No date ]"

#### Test: "should show created and updated timestamps in edit modal"

- **Description**: Edit modal displays when task was created and last modified
- **Steps**: Open edit modal for any task
- **Expected Output**:
  - "Created" timestamp visible
  - "Updated" timestamp visible

#### Test: "should edit done task name and notes"

- **Description**: Completed tasks can still be edited while maintaining their done status
- **Steps**:
  1. Click edit button on a done task
  2. Change name to "Updated completed task"
  3. Change notes to "Updated notes"
  4. Save
- **Expected Output**:
  - Task shows updated name and notes
  - Task remains marked as done with done styling

#### Test: "should edit done task ECD"

- **Description**: Can change the completion date on done tasks
- **Steps**:
  1. Edit a done task with date ECD
  2. Switch to "Monthly" mode
  3. Select 1st
  4. Save
- **Expected Output**:
  - Task shows "↻ 1st" instead of date
  - Task remains marked as done

---

### 5. Tasks - Update Move Priority (10 tests)

These tests verify manual reordering of tasks.

#### Test: "should move task up in priority"

- **Description**: Can move a task higher in the list
- **Steps**:
  1. Have three tasks
  2. Click "Move up" on Task 2
- **Expected Output**: Order becomes: Task 2, Task 1, Task 3

#### Test: "should move task down in priority"

- **Description**: Can move a task lower in the list
- **Steps**:
  1. Have three tasks
  2. Click "Move down" on Task 2
- **Expected Output**: Order becomes: Task 1, Task 3, Task 2

#### Test: "should disable move up for first undone task"

- **Description**: Can't move the first task any higher
- **Steps**: Create two tasks
- **Expected Output**: "Move up" button on Task 1 is disabled

#### Test: "should disable move down for last task"

- **Description**: Can't move the last task any lower
- **Steps**: Create two tasks
- **Expected Output**: "Move down" button on Task 2 is disabled

#### Test: "should not allow undone task to move below done task"

- **Description**: Undone tasks stay separated from done tasks
- **Steps**: Have Task 1 (undone) and Task 2 (done)
- **Expected Output**: "Move down" button on Task 1 is disabled

#### Test: "should not allow done task to move above undone task"

- **Description**: Done tasks stay in their own section
- **Steps**: Have Task 1 (undone) and Task 2 (done)
- **Expected Output**: "Move up" button on Task 2 is disabled

#### Test: "should move done task up within done section"

- **Description**: Done tasks can be reordered among themselves
- **Steps**:
  1. Have three done tasks
  2. Click "Move up" on Done Task 2
- **Expected Output**: Order becomes: Done Task 2, Done Task 1, Done Task 3

#### Test: "should move done task down within done section"

- **Description**: Done tasks can be moved down in their section
- **Steps**:
  1. Have three done tasks
  2. Click "Move down" on Done Task 2
- **Expected Output**: Order becomes: Done Task 1, Done Task 3, Done Task 2

#### Test: "should disable move up for first done task"

- **Description**: First done task can't move into undone section
- **Steps**: Have one undone task and two done tasks
- **Expected Output**: "Move up" button on first done task is disabled

#### Test: "should disable move down for last done task"

- **Description**: Last done task can't move any lower
- **Steps**: Have two done tasks
- **Expected Output**: "Move down" button on Done Task 2 is disabled

---

### 6. Tasks - Delete (9 tests)

These tests verify safe deletion of tasks.

#### Test: "should delete task via UI"

- **Description**: Users can remove tasks they don't need
- **Steps**:
  1. Create task "Write report"
  2. Click delete button
  3. Confirm deletion
- **Expected Output**:
  - Task disappears
  - Empty state message appears if no tasks remain

#### Test: "should show confirmation modal before deleting"

- **Description**: Prevents accidental deletions
- **Steps**: Click delete button on a task
- **Expected Output**: Confirmation popup asks 'Delete task "Write report"?'

#### Test: "should require a reason when deleting an undone task"

- **Description**: Deleting an unfinished task captures **why**, so the AI insights can analyze abandoned tasks
- **Steps**:
  1. Create an undone task "Abandon me"
  2. Click delete button
  3. Observe the required reason field and disabled Delete button
  4. Type a reason ("no longer needed") and confirm
- **Expected Output**:
  - Reason textarea is visible; Delete button is disabled until a reason is typed, then enabled
  - Task disappears
  - Backend logs a `task_deleted` archive event whose `reason` matches the entered text

#### Test: "should not ask for a reason when deleting a done task"

- **Description**: Completed tasks were accomplished, so no reason is requested
- **Steps**:
  1. Create a done task "Finished"
  2. Click delete button
- **Expected Output**: No reason field is shown; the Delete button is immediately enabled

#### Test: "should cancel delete on cancel button"

- **Description**: Users can change their mind
- **Steps**:
  1. Click delete
  2. Click Cancel in confirmation
- **Expected Output**: Task remains visible

#### Test: "should maintain priority order after deletion"

- **Description**: Deleting a task doesn't scramble remaining tasks
- **Steps**:
  1. Create four tasks
  2. Delete Task 2
- **Expected Output**: Remaining tasks in order: Task 1, Task 3, Task 4

#### Test: "should delete done task"

- **Description**: Completed tasks can be deleted
- **Steps**:
  1. Create a done task
  2. Click delete button
  3. Confirm deletion
- **Expected Output**: Done task is removed from the list

#### Test: "should maintain order after deleting done task"

- **Description**: Deleting a done task doesn't affect other tasks' positions
- **Steps**:
  1. Create two undone tasks and three done tasks
  2. Delete the middle done task (Completed 2)
- **Expected Output**: Remaining tasks in order: Active 1, Active 2, Completed 1, Completed 3

#### Test: "should show empty message when all done tasks are deleted"

- **Description**: Deleting all tasks shows the empty state
- **Steps**:
  1. Create two done tasks
  2. Delete both tasks
- **Expected Output**: "No tasks yet — add one!" message appears

---

### 7. Tasks - Display and Styling (4 tests)

These tests verify that done tasks display correctly with appropriate visual styling.

#### Test: "should display done task with done class"

- **Description**: Done tasks have distinct styling applied on page load
- **Steps**: Create a done task and reload the page
- **Expected Output**: Task card has the "task-card--done" CSS class

#### Test: "should display checkmark icon for done task on load"

- **Description**: Done tasks show a checkmark when the page loads
- **Steps**: Create a done task and reload the page
- **Expected Output**: Checkmark icon is visible on the task card

#### Test: "should display done tasks with notes correctly"

- **Description**: Done tasks with notes show both the done styling and the notes
- **Steps**: Create a done task with notes and reload
- **Expected Output**:
  - Task has done styling
  - "=>" indicator is visible
  - Notes text is displayed

#### Test: "should display done tasks with ECD correctly"

- **Description**: Done tasks with dates maintain both done styling and date display
- **Steps**: Create a done task with date ECD and reload
- **Expected Output**:
  - Task has done styling
  - Date "[ 06/15 ]" is visible

---

### 8. Tasks - Edge Cases with Done Tasks (6 tests)

These tests verify complex scenarios involving done tasks.

#### Test: "should handle all tasks being done"

- **Description**: Application works correctly when every task is completed
- **Steps**: Create three tasks and mark all as done
- **Expected Output**: All three tasks display with done styling

#### Test: "should preserve done status through edit operations"

- **Description**: Editing a done task doesn't accidentally mark it as undone
- **Steps**:
  1. Edit a done task's name
  2. Save changes
- **Expected Output**: Task shows new name but remains marked as done

#### Test: "should handle toggling multiple tasks to done"

- **Description**: Multiple tasks can be marked done in sequence
- **Steps**:
  1. Have three tasks
  2. Mark Task 1 as done
  3. Mark Task 2 as done
- **Expected Output**: Final order is Task 3 (undone), Task 1 (done), Task 2 (done)

#### Test: "should handle toggling all tasks between done and undone"

- **Description**: Tasks can be toggled back and forth multiple times
- **Steps**:
  1. Mark all tasks as done
  2. Mark all tasks as undone again
- **Expected Output**: All tasks return to undone state with correct styling

#### Test: "should maintain done/undone separation with multiple operations"

- **Description**: Done and undone sections stay separate during complex operations
- **Steps**:
  1. Start with 2 undone and 2 done tasks
  2. Mark an undone task as done
  3. Mark a done task as undone
- **Expected Output**: Undone tasks appear first, then done tasks

---

### 9. Tasks - Multiple Headers (2 tests)

These tests verify task isolation between different headers.

#### Test: "should isolate tasks per header"

- **Description**: Tasks in different headers don't mix
- **Steps**:
  1. Create "Work" and "Personal" headers
  2. Add tasks to each
- **Expected Output**:
  - Work header shows only its tasks
  - Personal header shows only its tasks

#### Test: "should allow same task name in different headers"

- **Description**: Different headers can have tasks with identical names
- **Steps**:
  1. Create task "Review" in Work header
  2. Create task "Review" in Personal header
- **Expected Output**: Both "Review" tasks exist independently

---

## Test Setup

### Before Each Test

- **Database Cleanup**: All data is cleared for a fresh start
- **Page Load**: Application loads at root URL "/"
- **Wait**: Ensures page is fully ready before testing begins

### Helper Functions Used

- `cleanDatabase()`: Removes all data
- `createHeader()`: Creates header via API (fast setup)
- `createTask()`: Creates task via API (fast setup)
- `waitForPageLoad()`: Ensures app is ready
- `addTaskViaUI()`: Creates task through the interface
- `deleteTaskViaUI()`: Deletes task through the interface
- `toggleTaskDone()`: Toggles task completion status
- `getTask()`: Gets a task element by name
- `isTaskDone()`: Checks if task is marked complete
- `getTaskNamesInHeader()`: Gets list of all task names in a header

---

## Technology Stack

- **Testing Framework**: Playwright
- **Test Type**: End-to-End (E2E)
- **Browser**: Tests run in actual browser environments

---

## Summary

These 56 tests comprehensively verify that:

1. ✅ Tasks can be created with various ECD types (date, weekly, monthly, yearly, none)
2. ✅ Tasks display correctly with all their information
3. ✅ Tasks can be toggled between done and undone states
4. ✅ Task information can be edited (name, notes, ECD), including done tasks
5. ✅ Tasks can be manually reordered within their priority group
6. ✅ Done tasks can be reordered within the done section
7. ✅ Tasks can be safely deleted with confirmation, including done tasks; deleting an undone task requires a reason that is archived for AI insights
8. ✅ Tasks remain isolated within their respective headers
9. ✅ The UI provides appropriate keyboard shortcuts and focus management
10. ✅ Done and undone tasks maintain proper separation
11. ✅ All modal interactions work correctly (open, close, cancel, submit)
12. ✅ Done tasks display with appropriate styling and visual indicators
13. ✅ Done status is preserved through edit and reload operations
14. ✅ Complex scenarios with multiple done/undone toggles work correctly
15. ✅ Edge cases like all tasks being done are handled properly

The tests ensure a robust and user-friendly task management experience within the Task At Hand application, with comprehensive coverage of both active and completed task workflows.
