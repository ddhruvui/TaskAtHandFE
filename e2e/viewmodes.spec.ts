/**
 * E2E tests for the view-mode toggles: Focus, Past, and By Date
 */

import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createHeader,
  createTask,
  waitForPageLoad,
  getTask,
  dateKey,
} from "./helpers";
import { formatDateKey } from "../src/utils/ecd";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const todayDow = DOW[new Date().getDay()];
const otherDow = DOW[(new Date().getDay() + 3) % 7];

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("View Modes - Focus", () => {
  test("should toggle focus button pressed state", async ({ page }) => {
    const btn = page.locator(".focus-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/focus-toggle-btn--active/);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  test("should show only tasks due today in focus mode", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Due today",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createTask({
      name: "Due tomorrow",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await createTask({ name: "No date task", headerId: header._id });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".focus-toggle-btn").click();

    await expect(getTask(page, "Due today")).toBeVisible();
    await expect(getTask(page, "Due tomorrow")).not.toBeVisible();
    await expect(getTask(page, "No date task")).not.toBeVisible();
  });

  test("should include recurring tasks due today in focus mode", async ({
    page,
  }) => {
    const header = await createHeader("Habits");
    await createTask({
      name: "Weekly today",
      headerId: header._id,
      ecd: { type: "day_of_week", value: [todayDow] },
    });
    await createTask({
      name: "Weekly other day",
      headerId: header._id,
      ecd: { type: "day_of_week", value: [otherDow] },
    });
    await createTask({
      name: "Monthly today",
      headerId: header._id,
      ecd: { type: "day_of_month", value: [new Date().getDate()] },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".focus-toggle-btn").click();

    await expect(getTask(page, "Weekly today")).toBeVisible();
    await expect(getTask(page, "Monthly today")).toBeVisible();
    await expect(getTask(page, "Weekly other day")).not.toBeVisible();
  });

  test("should hide headers with no matching tasks in focus mode", async ({
    page,
  }) => {
    const work = await createHeader("Work");
    const idle = await createHeader("Idle");
    await createTask({
      name: "Due today",
      headerId: work._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createTask({
      name: "Far future",
      headerId: idle._id,
      ecd: { type: "date", value: dateKey(30) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".focus-toggle-btn").click();

    await expect(
      page.locator(".readme-section", { hasText: "Work" }),
    ).toBeVisible();
    await expect(
      page.locator(".readme-section", { hasText: "Idle" }),
    ).not.toBeVisible();
  });

  test("should restore all tasks when focus mode is disabled", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Due tomorrow",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".focus-toggle-btn").click();
    await expect(getTask(page, "Due tomorrow")).not.toBeVisible();

    await page.locator(".focus-toggle-btn").click();
    await expect(getTask(page, "Due tomorrow")).toBeVisible();
  });
});

test.describe("View Modes - Past", () => {
  test("should show only overdue one-time tasks in past mode", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Overdue task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-1) },
    });
    await createTask({
      name: "Due today",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createTask({
      name: "Due tomorrow",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".past-toggle-btn").click();

    await expect(getTask(page, "Overdue task")).toBeVisible();
    await expect(getTask(page, "Due today")).not.toBeVisible();
    await expect(getTask(page, "Due tomorrow")).not.toBeVisible();
  });

  test("should not treat recurring tasks as past", async ({ page }) => {
    const header = await createHeader("Habits");
    await createTask({
      name: "Weekly habit",
      headerId: header._id,
      ecd: { type: "day_of_week", value: [todayDow] },
    });
    await createTask({
      name: "Monthly chore",
      headerId: header._id,
      ecd: { type: "day_of_month", value: [1] },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".past-toggle-btn").click();

    await expect(getTask(page, "Weekly habit")).not.toBeVisible();
    await expect(getTask(page, "Monthly chore")).not.toBeVisible();
  });

  test("should show today's and overdue tasks when focus and past are combined", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Overdue task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-1) },
    });
    await createTask({
      name: "Due today",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createTask({
      name: "Due tomorrow",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".focus-toggle-btn").click();
    await page.locator(".past-toggle-btn").click();

    await expect(getTask(page, "Overdue task")).toBeVisible();
    await expect(getTask(page, "Due today")).toBeVisible();
    await expect(getTask(page, "Due tomorrow")).not.toBeVisible();
  });
});

test.describe("View Modes - By Date", () => {
  test("should group tasks by date in ascending order", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Later task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(2) },
    });
    await createTask({
      name: "Today task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".bydate-toggle-btn").click();

    const groupLabels = page.locator(".readme-heading__text");
    await expect(groupLabels).toHaveText([
      formatDateKey(dateKey(0)),
      formatDateKey(dateKey(2)),
    ]);

    const todayGroup = page.locator(".readme-section", {
      hasText: formatDateKey(dateKey(0)),
    });
    await expect(todayGroup.getByText("Today task")).toBeVisible();
  });

  test("should show undated tasks under a No date group last", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Undated task", headerId: header._id });
    await createTask({
      name: "Dated task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".bydate-toggle-btn").click();

    const groupLabels = page.locator(".readme-heading__text");
    await expect(groupLabels).toHaveText([
      formatDateKey(dateKey(0)),
      "No date",
    ]);

    const noDateGroup = page.locator(".readme-section", { hasText: "No date" });
    await expect(noDateGroup.getByText("Undated task")).toBeVisible();
  });

  test("should exclude done tasks from the by date view", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Done task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
      done: true,
    });
    await createTask({
      name: "Open task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".bydate-toggle-btn").click();

    await expect(getTask(page, "Open task")).toBeVisible();
    await expect(getTask(page, "Done task")).not.toBeVisible();
  });

  test("should group recurring tasks due today under today's date", async ({
    page,
  }) => {
    const header = await createHeader("Habits");
    await createTask({
      name: "Weekly today",
      headerId: header._id,
      ecd: { type: "day_of_week", value: [todayDow] },
    });
    await createTask({
      name: "Weekly other day",
      headerId: header._id,
      ecd: { type: "day_of_week", value: [otherDow] },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".bydate-toggle-btn").click();

    const todayGroup = page.locator(".readme-section", {
      hasText: formatDateKey(dateKey(0)),
    });
    await expect(todayGroup.getByText("Weekly today")).toBeVisible();
    // Recurring tasks not due today have no calendar date and are hidden
    await expect(getTask(page, "Weekly other day")).not.toBeVisible();
  });

  test("should show empty state when there are no dated tasks", async ({
    page,
  }) => {
    await page.locator(".bydate-toggle-btn").click();

    await expect(page.getByText("No dated tasks to show.")).toBeVisible();
  });

  test("should combine by date view with the focus filter", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Due tomorrow",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".focus-toggle-btn").click();
    await page.locator(".bydate-toggle-btn").click();

    await expect(
      page.getByText("No dated tasks to show for this filter."),
    ).toBeVisible();

    // Disabling focus reveals tomorrow's group again
    await page.locator(".focus-toggle-btn").click();
    await expect(getTask(page, "Due tomorrow")).toBeVisible();
  });
});
