/**
 * E2E tests for Tasks functionality
 */

import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createHeader,
  createTask,
  waitForPageLoad,
  addTaskViaUI,
  deleteTaskViaUI,
  toggleTaskDone,
  getTask,
  getTaskNamesInHeader,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Tasks - Create", () => {
  test("should create a new task via UI", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    await addTaskViaUI(page, "Work", "Write report");

    await expect(getTask(page, "Write report")).toBeVisible();
  });

  test("should create task with notes", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Write report");
    await page.getByPlaceholder("Notes (optional)…").fill("Include Q1 data");
    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Write report");
    await expect(task.getByText("Include Q1 data")).toBeVisible();
  });

  test("should create task with date ECD", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Write report");

    // Select "Date" mode
    await page.getByRole("button", { name: "Date" }).click();
    await page.locator('input[type="date"]').fill("2026-06-15");

    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Write report");
    await expect(task.getByText("[ 06/15 ]")).toBeVisible();
  });

  test("should create task with weekly ECD", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Team meeting");

    // Select "Weekly" mode
    await page.getByRole("button", { name: "Weekly" }).click();

    // Select Mon and Fri
    await page.locator(".add-modal__dow-btn", { hasText: "Mon" }).click();
    await page.locator(".add-modal__dow-btn", { hasText: "Fri" }).click();

    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Team meeting");
    await expect(task.getByText(/↻.*Fri.*Mon/)).toBeVisible();
  });

  test("should create task with monthly ECD", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Monthly review");

    // Select "Monthly" mode
    await page.getByRole("button", { name: "Monthly" }).click();

    // Select 1st and 15th
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "15", exact: true }).click();

    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Monthly review");
    await expect(task.getByText(/↻.*1st.*15th/)).toBeVisible();
  });

  test("should create task with yearly ECD", async ({ page }) => {
    await createHeader("Personal");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Personal" });
    await header.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Birthday");

    // Select "Yearly" mode
    await page.getByRole("button", { name: "Yearly" }).click();
    await page
      .locator('input[placeholder="D/M/YYYY (e.g., 25/12/2026)"]')
      .fill("25/12/2026");

    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Birthday");
    await expect(task.getByText("↻ 25/12/2026")).toBeVisible();
  });

  test("should focus task name input when modal opens", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();

    const input = page.getByPlaceholder("Task name…");
    await expect(input).toBeFocused();
  });

  test("should close modal on cancel", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByPlaceholder("Task name…")).not.toBeVisible();
  });

  test("should close modal on Escape key", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();
    await page.getByPlaceholder("Task name…").press("Escape");

    await expect(page.getByPlaceholder("Task name…")).not.toBeVisible();
  });

  test("should submit on Enter key", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();
    await page.getByPlaceholder("Task name…").fill("Write report");
    await page.getByPlaceholder("Task name…").press("Enter");

    await expect(getTask(page, "Write report")).toBeVisible();
  });

  test("should disable submit when name is empty", async ({ page }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Add task").click();

    const addButton = page.getByRole("button", {
      name: "Add task",
      exact: true,
    });
    await expect(addButton).toBeDisabled();

    await page.getByPlaceholder("Task name…").fill("Write report");
    await expect(addButton).toBeEnabled();
  });
});

test.describe("Tasks - Read", () => {
  test("should display tasks in priority order", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });
    await createTask({ name: "Task 3", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 1", "Task 2", "Task 3"]);
  });

  test("should display undone tasks before done tasks", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id, done: false });
    await createTask({ name: "Task 2", headerId: header._id, done: true });
    await createTask({ name: "Task 3", headerId: header._id, done: false });

    await page.reload();
    await waitForPageLoad(page);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 1", "Task 3", "Task 2"]);
  });

  test("should show task with notes", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Write report",
      headerId: header._id,
      notes: "Include Q1 data",
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Write report");
    await expect(task.getByText("=>")).toBeVisible();
    await expect(task.getByText("Include Q1 data")).toBeVisible();
  });

  test("should show ECD date correctly", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Write report",
      headerId: header._id,
      ecd: { type: "date", value: "2026-06-15" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Write report");
    await expect(task.getByText("[ 06/15 ]")).toBeVisible();
  });

  test("should show recurring ECD with special icon", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Team meeting",
      headerId: header._id,
      ecd: { type: "day_of_week", value: ["Mon", "Wed"] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Team meeting");
    await expect(task.getByText(/↻.*Mon.*Wed/)).toBeVisible();
  });
});

test.describe("Tasks - Update Toggle Done", () => {
  test("should toggle task to done", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Write report", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    await toggleTaskDone(page, "Write report");

    // Wait for the task card to have the done class
    const task = getTask(page, "Write report");
    await expect(task).toHaveClass(/task-card--done/);

    // Should show checkmark
    await expect(task.locator(".task-card__check-icon")).toBeVisible();
  });

  test("should toggle task to undone", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Write report",
      headerId: header._id,
      done: true,
    });

    await page.reload();
    await waitForPageLoad(page);

    await toggleTaskDone(page, "Write report");

    // Wait for the task card to not have the done class
    const task = getTask(page, "Write report");
    await expect(task).not.toHaveClass(/task-card--done/);
  });

  test("should move task to end when marked done", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });
    await createTask({ name: "Task 3", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    // Mark Task 1 as done
    await toggleTaskDone(page, "Task 1");

    // Wait for the task card to have the done class
    await expect(getTask(page, "Task 1")).toHaveClass(/task-card--done/);
    await page.waitForTimeout(500);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 2", "Task 3", "Task 1"]);
  });

  test("should move task before done tasks when marked undone", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id, done: false });
    await createTask({ name: "Task 2", headerId: header._id, done: true });
    await createTask({ name: "Task 3", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    // Mark Task 2 as undone
    await toggleTaskDone(page, "Task 2");
    await page.waitForTimeout(500);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 1", "Task 2", "Task 3"]);
  });
});

test.describe("Tasks - Update Edit", () => {
  test("should edit task name and notes", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Write report",
      headerId: header._id,
      notes: "Old notes",
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Write report");
    await task.getByTitle("Edit notes").click();

    // Update name and notes
    await page.getByPlaceholder("Task name").fill("Submit report");
    await page.getByPlaceholder("Add notes…").fill("New notes");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(getTask(page, "Submit report")).toBeVisible();
    await expect(
      getTask(page, "Submit report").getByText("New notes"),
    ).toBeVisible();
  });

  test("should edit task ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Write report",
      headerId: header._id,
      ecd: { type: "date", value: "2026-06-15" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Write report");
    await task.getByTitle("Edit notes").click();

    // Change to weekly
    await page.getByRole("button", { name: "Weekly" }).click();
    await page.locator(".edit-modal__dow-btn", { hasText: "Mon" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText("↻ Mon")).toBeVisible();
  });

  test("should clear ECD by selecting None", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Write report",
      headerId: header._id,
      ecd: { type: "date", value: "2026-06-15" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Write report");
    await task.getByTitle("Edit notes").click();

    // Select "None"
    await page.getByRole("button", { name: "None" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText("[ No date ]")).toBeVisible();
  });

  test("should show created and updated timestamps in edit modal", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Write report", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Write report");
    await task.getByTitle("Edit notes").click();

    await expect(page.getByText(/Created/)).toBeVisible();
    await expect(page.getByText(/Updated/)).toBeVisible();
  });

  test("should edit done task name and notes", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Completed task",
      headerId: header._id,
      done: true,
      notes: "Original notes",
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Completed task");
    await task.getByTitle("Edit notes").click();

    await page.getByPlaceholder("Task name").fill("Updated completed task");
    await page.getByPlaceholder("Add notes…").fill("Updated notes");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(getTask(page, "Updated completed task")).toBeVisible();
    await expect(
      getTask(page, "Updated completed task").getByText("Updated notes"),
    ).toBeVisible();
    // Should still be marked as done
    await expect(getTask(page, "Updated completed task")).toHaveClass(
      /task-card--done/,
    );
  });

  test("should edit done task ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Completed task",
      headerId: header._id,
      done: true,
      ecd: { type: "date", value: "2026-06-15" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Completed task");
    await task.getByTitle("Edit notes").click();

    // Change to monthly
    await page.getByRole("button", { name: "Monthly" }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText(/↻.*1st/)).toBeVisible();
    // Should still be marked as done
    await expect(task).toHaveClass(/task-card--done/);
  });
});

test.describe("Tasks - Update Move Priority", () => {
  test("should move task up in priority", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });
    await createTask({ name: "Task 3", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    // Move Task 2 up
    const task = getTask(page, "Task 2");
    await task.getByTitle("Move up").click();
    await page.waitForTimeout(500);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 2", "Task 1", "Task 3"]);
  });

  test("should move task down in priority", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });
    await createTask({ name: "Task 3", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    // Move Task 2 down
    const task = getTask(page, "Task 2");
    await task.getByTitle("Move down").click();
    await page.waitForTimeout(500);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 1", "Task 3", "Task 2"]);
  });

  test("should disable move up for first undone task", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    const upButton = task.getByTitle("Move up");
    await expect(upButton).toBeDisabled();
  });

  test("should disable move down for last task", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 2");
    const downButton = task.getByTitle("Move down");
    await expect(downButton).toBeDisabled();
  });

  test("should not allow undone task to move below done task", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id, done: false });
    await createTask({ name: "Task 2", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    const downButton = task.getByTitle("Move down");
    await expect(downButton).toBeDisabled();
  });

  test("should not allow done task to move above undone task", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id, done: false });
    await createTask({ name: "Task 2", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 2");
    const upButton = task.getByTitle("Move up");
    await expect(upButton).toBeDisabled();
  });

  test("should move done task up within done section", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Done Task 1", headerId: header._id, done: true });
    await createTask({ name: "Done Task 2", headerId: header._id, done: true });
    await createTask({ name: "Done Task 3", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    // Move Done Task 2 up
    const task = getTask(page, "Done Task 2");
    await task.getByTitle("Move up").click();
    await page.waitForTimeout(500);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Done Task 2", "Done Task 1", "Done Task 3"]);
  });

  test("should move done task down within done section", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Done Task 1", headerId: header._id, done: true });
    await createTask({ name: "Done Task 2", headerId: header._id, done: true });
    await createTask({ name: "Done Task 3", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    // Move Done Task 2 down
    const task = getTask(page, "Done Task 2");
    await task.getByTitle("Move down").click();
    await page.waitForTimeout(500);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Done Task 1", "Done Task 3", "Done Task 2"]);
  });

  test("should disable move up for first done task", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Undone Task",
      headerId: header._id,
      done: false,
    });
    await createTask({ name: "Done Task 1", headerId: header._id, done: true });
    await createTask({ name: "Done Task 2", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Done Task 1");
    const upButton = task.getByTitle("Move up");
    await expect(upButton).toBeDisabled();
  });

  test("should disable move down for last done task", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Done Task 1", headerId: header._id, done: true });
    await createTask({ name: "Done Task 2", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Done Task 2");
    const downButton = task.getByTitle("Move down");
    await expect(downButton).toBeDisabled();
  });
});

test.describe("Tasks - Delete", () => {
  test("should delete task via UI", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Write report", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    await deleteTaskViaUI(page, "Write report");

    await expect(getTask(page, "Write report")).not.toBeVisible();
    await expect(
      page
        .locator(".readme-section", { hasText: "Work" })
        .getByText("No tasks yet — add one!"),
    ).toBeVisible();
  });

  test("should show confirmation modal before deleting", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Write report", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Write report");
    await task.getByTitle("Delete").click();

    await expect(page.getByText('Delete task "Write report"?')).toBeVisible();
  });

  test("should cancel delete on cancel button", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Write report", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Write report");
    await task.getByTitle("Delete").click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(getTask(page, "Write report")).toBeVisible();
  });

  test("should maintain priority order after deletion", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });
    await createTask({ name: "Task 3", headerId: header._id });
    await createTask({ name: "Task 4", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    await deleteTaskViaUI(page, "Task 2");

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 1", "Task 3", "Task 4"]);
  });

  test("should delete done task", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Done task", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    await deleteTaskViaUI(page, "Done task");

    await expect(getTask(page, "Done task")).not.toBeVisible();
  });

  test("should maintain order after deleting done task", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Active 1", headerId: header._id, done: false });
    await createTask({ name: "Active 2", headerId: header._id, done: false });
    await createTask({ name: "Completed 1", headerId: header._id, done: true });
    await createTask({ name: "Completed 2", headerId: header._id, done: true });
    await createTask({ name: "Completed 3", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    await deleteTaskViaUI(page, "Completed 2");

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual([
      "Active 1",
      "Active 2",
      "Completed 1",
      "Completed 3",
    ]);
  });

  test("should show empty message when all done tasks are deleted", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Done task 1", headerId: header._id, done: true });
    await createTask({ name: "Done task 2", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    await deleteTaskViaUI(page, "Done task 1");
    await deleteTaskViaUI(page, "Done task 2");

    await expect(
      page
        .locator(".readme-section", { hasText: "Work" })
        .getByText("No tasks yet — add one!"),
    ).toBeVisible();
  });
});

test.describe("Tasks - Display and Styling", () => {
  test("should display done task with done class", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Completed task",
      headerId: header._id,
      done: true,
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Completed task");
    await expect(task).toHaveClass(/task-card--done/);
  });

  test("should display checkmark icon for done task on load", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Completed task",
      headerId: header._id,
      done: true,
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Completed task");
    await expect(task.locator(".task-card__check-icon")).toBeVisible();
  });

  test("should display done tasks with notes correctly", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Completed task",
      headerId: header._id,
      done: true,
      notes: "Task notes",
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Completed task");
    await expect(task).toHaveClass(/task-card--done/);
    await expect(task.getByText("=>")).toBeVisible();
    await expect(task.getByText("Task notes")).toBeVisible();
  });

  test("should display done tasks with ECD correctly", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Completed task",
      headerId: header._id,
      done: true,
      ecd: { type: "date", value: "2026-06-15" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Completed task");
    await expect(task).toHaveClass(/task-card--done/);
    await expect(task.getByText("[ 06/15 ]")).toBeVisible();
  });
});

test.describe("Tasks - Edge Cases with Done Tasks", () => {
  test("should handle all tasks being done", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Done 1", headerId: header._id, done: true });
    await createTask({ name: "Done 2", headerId: header._id, done: true });
    await createTask({ name: "Done 3", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Done 1", "Done 2", "Done 3"]);

    // All should have done class
    for (const taskName of tasks) {
      await expect(getTask(page, taskName)).toHaveClass(/task-card--done/);
    }
  });

  test("should preserve done status through edit operations", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Completed task",
      headerId: header._id,
      done: true,
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Completed task");
    await task.getByTitle("Edit notes").click();
    await page.getByPlaceholder("Task name").fill("Updated task");
    await page.getByRole("button", { name: "Save" }).click();

    // Should still be done after edit
    await expect(getTask(page, "Updated task")).toHaveClass(/task-card--done/);
  });

  test("should handle toggling multiple tasks to done", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });
    await createTask({ name: "Task 3", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    await toggleTaskDone(page, "Task 1");
    await expect(getTask(page, "Task 1")).toHaveClass(/task-card--done/);
    await page.waitForTimeout(500);

    await toggleTaskDone(page, "Task 2");
    await expect(getTask(page, "Task 2")).toHaveClass(/task-card--done/);
    await page.waitForTimeout(500);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 3", "Task 1", "Task 2"]);
  });

  test("should handle toggling all tasks between done and undone", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id });
    await createTask({ name: "Task 2", headerId: header._id });

    await page.reload();
    await waitForPageLoad(page);

    // Mark all as done
    await toggleTaskDone(page, "Task 1");
    await page.waitForTimeout(500);
    await toggleTaskDone(page, "Task 2");
    await page.waitForTimeout(500);

    let tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 1", "Task 2"]);

    // Both should be done
    await expect(getTask(page, "Task 1")).toHaveClass(/task-card--done/);
    await expect(getTask(page, "Task 2")).toHaveClass(/task-card--done/);

    // Mark all as undone
    await toggleTaskDone(page, "Task 1");
    await page.waitForTimeout(500);
    await toggleTaskDone(page, "Task 2");
    await page.waitForTimeout(500);

    tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 1", "Task 2"]);

    // Both should be undone
    await expect(getTask(page, "Task 1")).not.toHaveClass(/task-card--done/);
    await expect(getTask(page, "Task 2")).not.toHaveClass(/task-card--done/);
  });

  test("should maintain done/undone separation with multiple operations", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Task 1", headerId: header._id, done: false });
    await createTask({ name: "Task 2", headerId: header._id, done: false });
    await createTask({ name: "Task 3", headerId: header._id, done: true });
    await createTask({ name: "Task 4", headerId: header._id, done: true });

    await page.reload();
    await waitForPageLoad(page);

    // Toggle Task 1 to done
    await toggleTaskDone(page, "Task 1");
    await page.waitForTimeout(500);

    // Toggle Task 3 to undone
    await toggleTaskDone(page, "Task 3");
    await page.waitForTimeout(500);

    const tasks = await getTaskNamesInHeader(page, "Work");
    expect(tasks).toEqual(["Task 2", "Task 3", "Task 4", "Task 1"]);
  });
});

test.describe("Tasks - Multiple Headers", () => {
  test("should isolate tasks per header", async ({ page }) => {
    const work = await createHeader("Work");
    const personal = await createHeader("Personal");

    await createTask({ name: "Work Task 1", headerId: work._id });
    await createTask({ name: "Work Task 2", headerId: work._id });
    await createTask({ name: "Personal Task 1", headerId: personal._id });

    await page.reload();
    await waitForPageLoad(page);

    const workTasks = await getTaskNamesInHeader(page, "Work");
    const personalTasks = await getTaskNamesInHeader(page, "Personal");

    expect(workTasks).toEqual(["Work Task 1", "Work Task 2"]);
    expect(personalTasks).toEqual(["Personal Task 1"]);
  });

  test("should allow same task name in different headers", async ({ page }) => {
    const work = await createHeader("Work");
    const personal = await createHeader("Personal");

    await createTask({ name: "Review", headerId: work._id });
    await createTask({ name: "Review", headerId: personal._id });

    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    const personalHeader = page.locator(".readme-section", {
      hasText: "Personal",
    });

    await expect(
      workHeader.locator(".task-card", { hasText: "Review" }),
    ).toBeVisible();
    await expect(
      personalHeader.locator(".task-card", { hasText: "Review" }),
    ).toBeVisible();
  });
});
