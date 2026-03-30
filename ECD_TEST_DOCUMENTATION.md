# ECD (Expected Completion Date) E2E Test Documentation

## Overview

This document describes the end-to-end (E2E) tests for the ECD (Expected Completion Date) functionality in the Task At Hand application. ECDs allow tasks to have different types of target completion dates - one-time dates, or recurring patterns (weekly, monthly, yearly).

## Test File Location

`e2e/ecd.spec.ts`

## Purpose

These tests verify that all ECD types display correctly, can be created and edited through the UI, and handle type conversions properly. ECDs are a core feature that helps users track when tasks should be completed.

---

## ECD Types

The application supports 5 types of Expected Completion Dates:

1. **Date** - One-time specific date (e.g., June 15, 2026)
2. **Day of Week** - Recurring weekly (e.g., every Monday and Friday)
3. **Day of Month** - Recurring monthly (e.g., 1st and 15th of each month)
4. **Day of Year** - Recurring yearly (e.g., December 25th every year)
5. **None** - No date specified

---

## Test Categories

### 1. ECD - Date Type (5 tests)

Tests for one-time date completion targets.

#### Test: "should display date ECD in short format for current year"

- **Description**: Dates in the same year show without the year
- **Steps**: Create task with date in current year (2026-06-15)
- **Expected Output**: Displays as "[ 06/15 ]" (without year)

#### Test: "should display date ECD with year for different year"

- **Description**: Dates in different years include the year
- **Steps**: Create task with date in next year (2027-06-15)
- **Expected Output**: Displays as "[ 06/15/27 ]" (with 2-digit year)

#### Test: "should create date ECD via UI"

- **Description**: Users can select a date through the interface
- **Steps**:
  1. Open add task modal
  2. Select "Date" mode
  3. Choose 2026-12-31
  4. Click "Add task" button
- **Expected Output**: Task shows "[ 12/31 ]"

#### Test: "should edit date ECD"

- **Description**: Can change the date on existing tasks
- **Steps**:
  1. Open edit modal for task with date 2026-06-15
  2. Change date to 2026-09-20
- **Expected Output**: Task now shows "[ 09/20 ]"

#### Test: "should validate date format"

- **Description**: Browser validates date input
- **Steps**: Check date input field attributes
- **Expected Output**: Input field has type="date" for proper validation

---

### 2. ECD - Day of Week Type (7 tests)

Tests for weekly recurring tasks.

#### Test: "should display day_of_week ECD with recurring icon"

- **Description**: Weekly tasks show with rotation symbol
- **Steps**: Create task with days Mon, Wed, Fri
- **Expected Output**: Displays "↻ Mon Wed Fri" (alphabetically sorted)

#### Test: "should create day_of_week ECD via UI"

- **Description**: Can select multiple days of the week
- **Steps**:
  1. Open add task modal
  2. Select "Weekly" mode
  3. Click Mon, Wed, Fri buttons
  4. Click "Add task" button
- **Expected Output**: Task shows "↻ Mon Wed Fri"

#### Test: "should allow selecting single day of week"

- **Description**: Can create weekly task for just one day
- **Steps**:
  1. Select "Weekly" mode
  2. Mon is selected by default
  3. Click "Add task" button
- **Expected Output**: Task shows "↻ Mon"

#### Test: "should toggle days on and off"

- **Description**: Can select and deselect days
- **Steps**:
  1. Mon selected by default
  2. Click Fri to add it (both selected)
  3. Click Mon to remove it (only Fri selected)
- **Expected Output**:
  - Both buttons highlighted when selected
  - Only Fri highlighted after deselecting Mon

#### Test: "should not allow deselecting last day"

- **Description**: Must have at least one day selected
- **Steps**:
  1. Only Mon is selected
  2. Try to deselect Mon
- **Expected Output**: Mon remains selected (can't have zero days)

#### Test: "should edit day_of_week ECD"

- **Description**: Can change which days are selected
- **Steps**:
  1. Edit task currently set to Mon
  2. Add Wed
- **Expected Output**: Task now shows "↻ Mon Wed"

#### Test: "should display all days of week"

- **Description**: Can select all 7 days
- **Steps**: Create task with all days selected
- **Expected Output**: Displays all days: Mon, Tue, Wed, Thu, Fri, Sat, Sun

---

### 3. ECD - Day of Month Type (6 tests)

Tests for monthly recurring tasks.

#### Test: "should display day_of_month ECD with ordinal numbers"

- **Description**: Monthly dates show with proper suffixes
- **Steps**: Create task for 1st and 15th of month
- **Expected Output**: Displays "↻ 1st 15th" (with ordinal suffixes)

#### Test: "should create day_of_month ECD via UI"

- **Description**: Can select specific days of the month
- **Steps**:
  1. Select "Monthly" mode
  2. Click 1st and 15th
  3. Click "Add task" button
- **Expected Output**: Task shows "↻ 1st 15th"

#### Test: "should show correct ordinal suffixes"

- **Description**: All ordinals display properly (st, nd, rd, th)
- **Steps**: Create task with days 1, 2, 3, 21, 22, 23, 31
- **Expected Output**: Shows "1st, 2nd, 3rd, 21st, 22nd, 23rd, 31st" with correct suffixes

#### Test: "should sort day_of_month values ascending"

- **Description**: Days are displayed in order regardless of selection order
- **Steps**: Create task selecting days 15, 1, 30 (out of order)
- **Expected Output**: Displays "↻ 1st 15th 30th" (sorted)

#### Test: "should toggle day_of_month values"

- **Description**: Can select and deselect days
- **Steps**:
  1. 1st selected by default
  2. Add 15th (both selected)
  3. Deselect 1st (only 15th selected)
- **Expected Output**: Buttons highlight/unhighlight appropriately

#### Test: "should not allow deselecting last day_of_month"

- **Description**: Must have at least one day selected
- **Steps**:
  1. Only 1st is selected
  2. Try to deselect it
- **Expected Output**: 1st remains selected

#### Test: "should edit day_of_month ECD"

- **Description**: Can modify selected days
- **Steps**:
  1. Edit task set to 1st
  2. Add 15th
- **Expected Output**: Task now shows "↻ 1st 15th"

---

### 4. ECD - Day of Year Type (4 tests)

Tests for yearly recurring tasks.

#### Test: "should display day_of_year ECD in D/M/YYYY format"

- **Description**: Annual dates show in day/month/year format
- **Steps**: Create task for 25/12/2026 (Christmas)
- **Expected Output**: Displays "↻ 25/12/2026"

#### Test: "should create day_of_year ECD via UI"

- **Description**: Can enter a date for annual recurrence
- **Steps**:
  1. Select "Yearly" mode
  2. Enter 14/2/2027 in the date input field (placeholder: "D/M/YYYY (e.g., 25/12/2026)")
  3. Click "Add task" button
- **Expected Output**: Task shows "↻ 14/2/2027"

#### Test: "should edit day_of_year ECD"

- **Description**: Can change the annual date
- **Steps**:
  1. Edit task with 25/12/2026
  2. Change to 1/1/2027 in the date input field (placeholder: "D/M/YYYY (e.g., 25/12/2026)")
  3. Click "Save" button
- **Expected Output**: Task now shows "↻ 1/1/2027"

#### Test: "should default to today's date for new yearly ECD"

- **Description**: Date input pre-fills with current date
- **Steps**:
  1. Select "Yearly" mode in add modal
  2. Check the date input value
- **Expected Output**: Input shows today's date in D/M/YYYY format

---

### 5. ECD - No Date (3 tests)

Tests for tasks without a completion date.

#### Test: "should show 'No date' when ECD is null"

- **Description**: Tasks without dates display clearly
- **Steps**: Create task with ecd: null
- **Expected Output**: Displays "[ No date ]"

#### Test: "should select 'None' by default in add modal"

- **Description**: New tasks start without a date
- **Steps**: Open add task modal
- **Expected Output**: "None" button is highlighted as active default

#### Test: "should create task with no ECD"

- **Description**: Can create tasks without specifying a date
- **Steps**:
  1. Open add modal
  2. Enter name
  3. Keep "None" selected
  4. Click "Add task" button
- **Expected Output**: Task shows "[ No date ]"

---

### 6. ECD - Type Conversion (4 tests)

Tests for changing ECD types on existing tasks.

#### Test: "should convert from date to weekly ECD"

- **Description**: Can change a one-time date to recurring weekly
- **Steps**:
  1. Edit task with date ECD (2026-06-15)
  2. Switch to "Weekly" mode
  3. Select Mon
- **Expected Output**: Task changes from "[ 06/15 ]" to "↻ Mon"

#### Test: "should convert from weekly to monthly ECD"

- **Description**: Can change from weekly to monthly recurrence
- **Steps**:
  1. Edit task with weekly ECD (Mon)
  2. Switch to "Monthly" mode
  3. Select 1st
- **Expected Output**: Task changes from "↻ Mon" to "↻ 1st"

#### Test: "should convert from monthly to yearly ECD"

- **Description**: Can change from monthly to yearly recurrence
- **Steps**:
  1. Edit task with monthly ECD (1st)
  2. Switch to "Yearly" mode
  3. Enter 1/1/2027
- **Expected Output**: Task changes from "↻ 1st" to "↻ 1/1/2027"

#### Test: "should convert from any type to none"

- **Description**: Can remove the date from any task
- **Steps**:
  1. Edit task with any ECD type
  2. Select "None" mode
- **Expected Output**: Task shows "[ No date ]"

---

## Display Format Reference

### Visual Indicators

- **One-time dates**: Enclosed in square brackets `[ 06/15 ]`
- **Recurring dates**: Prefixed with rotation symbol `↻ Mon Wed`
- **No date**: Shown as `[ No date ]`

### Format Examples

- **Date (current year)**: `[ 06/15 ]`
- **Date (other year)**: `[ 06/15/27 ]`
- **Weekly**: `↻ Fri Mon Wed` (days displayed in order)
- **Monthly**: `↻ 1st 15th 30th` (numerically sorted with ordinals)
- **Yearly**: `↻ 25/12/2026` (D/M/YYYY format)
- **None**: `[ No date ]`

---

## Test Setup

### Before Each Test

- **Database Cleanup**: All data cleared for fresh start
- **Page Load**: Application loads at root URL "/"
- **Wait**: Page fully ready before tests begin

### Helper Functions Used

- `cleanDatabase()`: Removes all data
- `createHeader()`: Creates header via API
- `createTask()`: Creates task with specific ECD via API
- `waitForPageLoad()`: Ensures app is ready
- `getTask()`: Gets task element by name

---

## Technology Stack

- **Testing Framework**: Playwright
- **Test Type**: End-to-End (E2E)
- **Browser**: Tests run in actual browser environments

---

## Summary

These 30 tests comprehensively verify that:

1. ✅ All 5 ECD types display with correct formatting
2. ✅ ECDs can be created through the UI for all types
3. ✅ ECDs can be edited and changed
4. ✅ Date formats are validated appropriately
5. ✅ Days/dates are sorted and displayed correctly
6. ✅ Users cannot create invalid configurations (e.g., zero days selected)
7. ✅ ECD types can be converted between each other
8. ✅ Ordinal numbers display correctly (1st, 2nd, 3rd, etc.)
9. ✅ Recurring dates use the ↻ symbol for clarity
10. ✅ Default values are sensible (None for new tasks, today for yearly)

The tests ensure that the ECD system provides flexible and reliable date tracking for tasks, supporting both one-time and various recurring patterns.
