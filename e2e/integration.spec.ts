/**
 * Integration tests - Complex workflows and edge cases
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createHeader,
  createTask,
  waitForPageLoad,
  addHeaderViaUI,
  addTaskViaUI,
  deleteHeaderViaUI,
  deleteTaskViaUI,
  toggleTaskDone,
  getTask,
  getTaskNamesInHeader,
  getHeaderNames,
  calendarMonthLabel,
  dateEcdLabel,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Integration - Complete Workflows", () => {
  test("should complete full task lifecycle", async ({ page }) => {
    // Create header
    await addHeaderViaUI(page, "Work");

    // Add task with details
    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();
    await page.getByPlaceholder("Task name…").fill("Complete project");
    await page.getByPlaceholder("Notes (optional)…").fill("Initial notes");
    await page.getByRole("button", { name: "Date", exact: true }).click();

    // Navigate calendar two months forward from the current month
    for (let i = 0; i < 2; i++) {
      await page.getByLabel("Next month").click();
    }
    await expect(page.locator(".ecd-calendar__month-label")).toHaveText(
      calendarMonthLabel(2),
    );
    await page.locator(".ecd-calendar__day", { hasText: /^28$/ }).click();

    await page.getByRole("button", { name: "Add task", exact: true }).click();

    // Verify task created
    const task = getTask(page, "Complete project");
    await expect(task.getByText("Initial notes")).toBeVisible();
    await expect(task.getByText(dateEcdLabel(2, 28))).toBeVisible();

    // Edit task
    await task.getByTitle("Edit notes").click();
    await page.getByPlaceholder("Task name").fill("Submit project");
    await page.getByPlaceholder("Add notes…").fill("Updated notes");
    await page.getByRole("button", { name: "Save" }).click();

    // Verify edits
    const updatedTask = getTask(page, "Submit project");
    await expect(updatedTask.getByText("Updated notes")).toBeVisible();

    // Mark as done
    await toggleTaskDone(page, "Submit project");
    await page.waitForTimeout(300);

    // Verify done state
    const doneTask = getTask(page, "Submit project");
    await expect(doneTask.locator(".task-card__check-icon")).toBeVisible();

    // Delete task
    await deleteTaskViaUI(page, "Submit project");

    // Verify deleted
    await expect(getTask(page, "Submit project")).not.toBeVisible();
  });

  test("should create and manage multiple headers with tasks", async ({
    page,
  }) => {
    // Create multiple headers
    await addHeaderViaUI(page, "Work");
    await addHeaderViaUI(page, "Personal");
    await addHeaderViaUI(page, "Shopping");

    // Add tasks to each
    await addTaskViaUI(page, "Work", "Work Task 1");
    await expect(getTask(page, "Work Task 1")).toBeVisible();
    await addTaskViaUI(page, "Work", "Work Task 2");
    await expect(getTask(page, "Work Task 2")).toBeVisible();
    await addTaskViaUI(page, "Personal", "Personal Task 1");
    await expect(getTask(page, "Personal Task 1")).toBeVisible();
    await addTaskViaUI(page, "Shopping", "Buy groceries");
    await expect(getTask(page, "Buy groceries")).toBeVisible();

    // Verify all tasks are in correct headers
    const workTasks = await getTaskNamesInHeader(page, "Work");
    const personalTasks = await getTaskNamesInHeader(page, "Personal");
    const shoppingTasks = await getTaskNamesInHeader(page, "Shopping");

    expect(workTasks).toEqual(["Work Task 1", "Work Task 2"]);
    expect(personalTasks).toEqual(["Personal Task 1"]);
    expect(shoppingTasks).toEqual(["Buy groceries"]);

    // Delete middle header
    await deleteHeaderViaUI(page, "Personal");

    // Verify headers reordered correctly
    const headers = await getHeaderNames(page);
    expect(headers).toEqual(["Work", "Shopping"]);

    // Verify remaining tasks still exist
    const remainingWorkTasks = await getTaskNamesInHeader(page, "Work");
    expect(remainingWorkTasks).toEqual(["Work Task 1", "Work Task 2"]);
  });

  test("should handle complex task reordering scenario", async ({ page }) => {
    const header = await createHeader("Work");

    // Create mix of done and undone tasks
    await createTask({
      name: "Not done first",
      headerId: header._id,
      done: false,
    });
    await createTask({
      name: "Not done second",
      headerId: header._id,
      done: false,
    });
    await createTask({
      name: "Finished first",
      headerId: header._id,
      done: true,
    });
    await createTask({
      name: "Finished second",
      headerId: header._id,
      done: true,
    });

    await page.reload();
    await waitForPageLoad(page);

    // Verify initial order
    let tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual([
      "Not done first",
      "Not done second",
      "Finished first",
      "Finished second",
    ]);

    // Swap undone tasks
    const undone2 = getTask(page, "Not done second");
    await undone2.getByTitle("Move up").click();

    await expect(async () => {
      tasks = await getTaskNamesInHeader(page, "Work");
      expect(tasks).toEqual([
        "Not done second",
        "Not done first",
        "Finished first",
        "Finished second",
      ]);
    }).toPass({ timeout: 5000 });

    // Mark Not done second as done (should move to end)
    await toggleTaskDone(page, "Not done second");

    await expect(async () => {
      tasks = await getTaskNamesInHeader(page, "Work");
      expect(tasks).toEqual([
        "Not done first",
        "Finished first",
        "Finished second",
        "Not done second",
      ]);
    }).toPass({ timeout: 5000 });

    // Mark Finished first as undone (should move before other done tasks)
    await toggleTaskDone(page, "Finished first");

    await expect(async () => {
      tasks = await getTaskNamesInHeader(page, "Work");
      expect(tasks).toEqual([
        "Not done first",
        "Finished first",
        "Finished second",
        "Not done second",
      ]);
    }).toPass({ timeout: 5000 });
  });

  test("should persist state across page reload", async ({ page }) => {
    // Create complex state
    await addHeaderViaUI(page, "Work");
    await addTaskViaUI(page, "Work", "Task 1");
    await addTaskViaUI(page, "Work", "Task 2");
    await toggleTaskDone(page, "Task 1");
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await waitForPageLoad(page);

    // Verify state persisted
    const headers = await getHeaderNames(page);
    expect(headers).toContain("Work");

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 2", "Task 1"]);

    // Verify Task 1 is still done
    const task1 = getTask(page, "Task 1");
    await expect(task1.locator(".task-card__check-icon")).toBeVisible();
  });
});

test.describe("Integration - Edge Cases", () => {
  test("should handle empty header name gracefully", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();

    // Button should be disabled with empty name
    const addButton = page.getByRole("button", { name: "Add", exact: true });
    await expect(addButton).toBeDisabled();

    // Modal should still be open
    await expect(page.getByPlaceholder("Header name…")).toBeVisible();
  });

  test("should handle empty task name gracefully", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    // Button should be disabled with empty name
    const addButton = page.getByRole("button", {
      name: "Add task",
      exact: true,
    });
    await expect(addButton).toBeDisabled();

    // Modal should still be open
    await expect(page.getByPlaceholder("Task name…")).toBeVisible();
  });

  test("should handle very long header names", async ({ page }) => {
    const longName = "A".repeat(200);
    await addHeaderViaUI(page, longName);

    await expect(page.locator("h2", { hasText: longName })).toBeVisible();
  });

  test("should handle very long task names and notes", async ({ page }) => {
    const header = await createHeader("Work");
    const longName = "Task ".repeat(50);
    const longNotes = "Note ".repeat(200);

    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();
    await page.getByPlaceholder("Task name…").fill(longName);
    await page.getByPlaceholder("Notes (optional)…").fill(longNotes);
    await page.getByRole("button", { name: "Add task", exact: true }).click();

    await expect(getTask(page, longName)).toBeVisible();
  });

  test("should handle special characters in names", async ({ page }) => {
    const specialName = "Test & <script>alert('xss')</script> > < \"quotes\"";
    await addHeaderViaUI(page, specialName);

    // Header name should be displayed safely (escaped)
    await expect(page.locator(".readme-heading__text")).toContainText("Test &");
  });

  test("should handle rapid consecutive operations", async ({ page }) => {
    // Rapidly create multiple headers
    for (let i = 1; i <= 5; i++) {
      await addHeaderViaUI(page, `Header ${i}`);
    }

    await page.waitForTimeout(500);

    const headers = await getHeaderNames(page);
    expect(headers).toHaveLength(5);
  });

  test("should handle deleting header with many tasks", async ({ page }) => {
    const header = await createHeader("Work");

    // Create many tasks
    for (let i = 1; i <= 20; i++) {
      await createTask({ name: `Task ${i}`, headerId: header._id });
    }

    await page.reload();
    await waitForPageLoad(page);

    // Verify all tasks loaded
    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toHaveLength(20);

    // Delete header (should cascade delete all tasks)
    await deleteHeaderViaUI(page, "Work");

    // Verify everything is gone
    await expect(page.locator("h2", { hasText: "Work" })).not.toBeVisible();
    await expect(page.getByText("No headers yet — add one!")).toBeVisible();
  });

  test("should maintain task isolation between headers after operations", async ({
    page,
  }) => {
    const work = await createHeader("Work");
    const personal = await createHeader("Personal");

    await createTask({ name: "Work 1", headerId: work._id });
    await createTask({ name: "Work 2", headerId: work._id });
    await createTask({ name: "Personal 1", headerId: personal._id });
    await createTask({ name: "Personal 2", headerId: personal._id });

    await page.reload();
    await waitForPageLoad(page);

    // Toggle done on Work task
    await toggleTaskDone(page, "Work 1");
    await expect(getTask(page, "Work 1")).toHaveClass(/task-card--done/);
    await page.waitForTimeout(500);

    // Personal tasks should be unaffected
    const workTasks = await getTaskNamesInHeader(page, "Work");
    const personalTasks = await getTaskNamesInHeader(page, "Personal");

    expect(workTasks).toEqual(["Work 2", "Work 1"]);
    expect(personalTasks).toEqual(["Personal 1", "Personal 2"]);
  });

  test("should handle all ECD types in same header", async ({ page }) => {
    const header = await createHeader("Mixed");

    await createTask({
      name: "Date task",
      headerId: header._id,
      ecd: { type: "date", value: "2026-12-31" },
    });
    await createTask({
      name: "Weekly task",
      headerId: header._id,
      ecd: { type: "day_of_week", value: ["Mon"] },
    });
    await createTask({
      name: "Monthly task",
      headerId: header._id,
      ecd: { type: "day_of_month", value: [1] },
    });
    await createTask({
      name: "Yearly task",
      headerId: header._id,
      ecd: { type: "day_of_year", value: "1/1/2027" },
    });
    await createTask({
      name: "No date task",
      headerId: header._id,
      ecd: null,
    });

    await page.reload();
    await waitForPageLoad(page);

    // Verify all tasks display correctly
    await expect(
      getTask(page, "Date task").getByText("[ 12/31 ]"),
    ).toBeVisible();
    await expect(getTask(page, "Weekly task").getByText("↻ Mon")).toBeVisible();
    await expect(
      getTask(page, "Monthly task").getByText("↻ 1st"),
    ).toBeVisible();
    await expect(
      getTask(page, "Yearly task").getByText("↻ 1/1/2027"),
    ).toBeVisible();
    await expect(
      getTask(page, "No date task").getByText("[ No date ]"),
    ).toBeVisible();
  });
});

test.describe("Integration - Modal Interactions", () => {
  test("should allow switching between modals without issues", async ({
    page,
  }) => {
    await addHeaderViaUI(page, "Work");

    // Open add task modal
    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    // Close it
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(200);

    // Open edit header modal
    await workHeader.getByTitle("Edit header").click();

    // Close it
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(200);

    // Open add header modal
    await page.getByRole("button", { name: "Add header" }).click();

    // Should be able to add
    await page.getByPlaceholder("Header name…").fill("Personal");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(async () => {
      const headers = await getHeaderNames(page);
      expect(headers).toEqual(["Work", "Personal"]);
    }).toPass({ timeout: 5000 });
  });

  test("should handle opening and canceling multiple modals in sequence", async ({
    page,
  }) => {
    await addHeaderViaUI(page, "Work");
    await addTaskViaUI(page, "Work", "Task 1");

    // Open and cancel edit modal 3 times
    for (let i = 0; i < 3; i++) {
      await getTask(page, "Task 1").getByTitle("Edit notes").click();
      await page.getByRole("button", { name: "Cancel" }).click();
    }

    // Should still be able to edit
    await getTask(page, "Task 1").getByTitle("Edit notes").click();
    await page.getByPlaceholder("Task name").fill("Task Updated");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(getTask(page, "Task Updated")).toBeVisible();
  });

  test("should handle confirming delete modals correctly", async ({ page }) => {
    await addHeaderViaUI(page, "Work");
    await addTaskViaUI(page, "Work", "Task 1");
    await addTaskViaUI(page, "Work", "Task 2");

    // Try to delete Task 1 but cancel
    await getTask(page, "Task 1").getByTitle("Delete").click();
    await page.getByRole("button", { name: "Cancel" }).click();

    // Task 1 should still exist
    await expect(getTask(page, "Task 1")).toBeVisible();

    // Now actually delete Task 2
    await getTask(page, "Task 2").getByTitle("Delete").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // Task 2 should be gone
    await expect(getTask(page, "Task 2")).not.toBeVisible();
    await expect(getTask(page, "Task 1")).toBeVisible();
  });
});

test.describe("Integration - Data Consistency", () => {
  test("should maintain priority consistency after multiple operations", async ({
    page,
  }) => {
    const header = await createHeader("Work");

    // Create tasks
    await createTask({ name: "Task A", headerId: header._id });
    await createTask({ name: "Task B", headerId: header._id });
    await createTask({ name: "Task C", headerId: header._id });
    await createTask({ name: "Task D", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    // Complex series of operations
    await toggleTaskDone(page, "Task B");
    await expect(getTask(page, "Task B")).toHaveClass(/task-card--done/);
    await page.waitForTimeout(500);

    await getTask(page, "Task C").getByTitle("Move up").click();
    await page.waitForTimeout(500);

    await toggleTaskDone(page, "Task D");
    await expect(getTask(page, "Task D")).toHaveClass(/task-card--done/);
    await page.waitForTimeout(500);

    await deleteTaskViaUI(page, "Task D");

    // Verify final state is consistent
    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task C", "Task A", "Task B"]);
  });

  test("should handle task priority after changing done status multiple times", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });
    await createTask({ name: "Task 3", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    // Toggle Task 2 done
    await toggleTaskDone(page, "Task 2");

    await expect(async () => {
      const t = await getTaskNamesInHeader(page, "Work");
      expect(t).toEqual(["Task 1", "Task 3", "Task 2"]);
    }).toPass({ timeout: 5000 });

    // Toggle Task 2 undone
    await toggleTaskDone(page, "Task 2");

    await expect(async () => {
      const t = await getTaskNamesInHeader(page, "Work");
      expect(t).toEqual(["Task 1", "Task 3", "Task 2"]);
    }).toPass({ timeout: 5000 });

    // Toggle Task 2 done again
    await toggleTaskDone(page, "Task 2");

    await expect(async () => {
      const t = await getTaskNamesInHeader(page, "Work");
      expect(t).toEqual(["Task 1", "Task 3", "Task 2"]);
    }).toPass({ timeout: 5000 });
  });
});

test.describe("Integration - UI Responsiveness", () => {
  test("should show loading state briefly on page load", async ({ page }) => {
    await cleanDatabase();

    // Navigate to page
    await page.goto("/");

    // Should show loading message initially
    await expect(page.getByText("Loading…")).toBeVisible();

    // Should eventually show empty state
    await waitForPageLoad(page);
    await expect(page.getByText("No headers yet — add one!")).toBeVisible();
  });

  test("should update UI immediately after operations", async ({ page }) => {
    await addHeaderViaUI(page, "Work");

    // Add task should show immediately
    await addTaskViaUI(page, "Work", "New task");
    await expect(getTask(page, "New task")).toBeVisible();

    // Edit should show immediately
    const task = getTask(page, "New task");
    await task.getByTitle("Edit notes").click();
    await page.getByPlaceholder("Task name").fill("Updated task");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(getTask(page, "Updated task")).toBeVisible();
  });

  test("should handle error state gracefully", async ({ page, context }) => {
    // Create some initial data
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    // Simulate API failure for subsequent operations
    await context.route("**/tasks", (route) => {
      if (route.request().method() === "POST") {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Try to add task (should show error)
    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();
    await page.getByPlaceholder("Task name…").fill("Task 1");
    await page.getByRole("button", { name: "Add task", exact: true }).click();

    // Should show error message
    await expect(page.getByText(/Action failed/)).toBeVisible();
  });
});
