/**
 * E2E tests for the By Date view mode
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

test.describe("View Modes - By Date", () => {
  test("should toggle by date button pressed state", async ({ page }) => {
    const btn = page.locator(".bydate-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/bydate-toggle-btn--active/);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  test("should order groups as today first, then past, then future", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Future task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(2) },
    });
    await createTask({
      name: "Old task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-3) },
    });
    await createTask({
      name: "Older task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-5) },
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
      formatDateKey(dateKey(-5)),
      formatDateKey(dateKey(-3)),
      formatDateKey(dateKey(2)),
    ]);

    const todayGroup = page.locator(".readme-section", {
      hasText: formatDateKey(dateKey(0)),
    });
    await expect(todayGroup.getByText("Today task")).toBeVisible();
  });

  test("should divide present, past and future with thick dividers", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Today task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createTask({
      name: "Old task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-3) },
    });
    await createTask({
      name: "Future task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(2) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".bydate-toggle-btn").click();

    // Three populated sections → two dividers between them
    await expect(page.locator(".bydate-divider")).toHaveCount(2);
  });

  test("should not render dividers when only one section has tasks", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Future task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(2) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".bydate-toggle-btn").click();

    await expect(getTask(page, "Future task")).toBeVisible();
    await expect(page.locator(".bydate-divider")).toHaveCount(0);
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
});
