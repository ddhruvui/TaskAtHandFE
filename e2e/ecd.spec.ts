/**
 * E2E tests for ECD (Expected Completion Date) functionality
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createHeader,
  createTask,
  waitForPageLoad,
  getTask,
  calendarMonthLabel,
  dateEcdLabel,
  yearlyEcdLabel,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("ECD - Date Type", () => {
  test("should display date ECD in short format for current year", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    const currentYear = new Date().getFullYear();
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "date", value: `${currentYear}-06-15` },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    await expect(task.getByText("[ 06/15 ]")).toBeVisible();
  });

  test("should display date ECD with year for different year", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    const nextYear = new Date().getFullYear() + 1;
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "date", value: `${nextYear}-06-15` },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    const yearShort = String(nextYear).slice(-2);
    await expect(task.getByText(`[ 06/15/${yearShort} ]`)).toBeVisible();
  });

  test("should create date ECD via UI", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Project deadline");
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

    const task = getTask(page, "Project deadline");
    await expect(task.getByText(dateEcdLabel(2, 28))).toBeVisible();
  });

  test("should edit date ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "date", value: "2026-06-15" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    await task.getByTitle("Edit notes").click();

    // Calendar opens on June 2026 (current ECD month). Navigate to September.
    for (let i = 0; i < 3; i++) {
      await page.getByLabel("Next month").click();
    }
    await expect(page.locator(".ecd-calendar__month-label")).toHaveText(
      "September 2026",
    );
    await page.locator(".ecd-calendar__day", { hasText: /^20$/ }).click();

    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText("[ 09/20 ]")).toBeVisible();
  });

  test("should show calendar when Date mode selected", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Task 1");
    await page.getByRole("button", { name: "Date", exact: true }).click();

    // Calendar should be visible with navigation and day grid
    await expect(page.locator(".ecd-calendar")).toBeVisible();
    await expect(page.locator(".ecd-calendar__month-label")).toBeVisible();
    await expect(page.getByLabel("Previous month")).toBeVisible();
    await expect(page.getByLabel("Next month")).toBeVisible();
  });
});

test.describe("ECD - Day of Week Type", () => {
  test("should display day_of_week ECD with recurring icon", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Team standup",
      headerId: header._id,
      ecd: { type: "day_of_week", value: ["Mon", "Wed", "Fri"] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Team standup");
    await expect(task.getByText(/↻.*Mon.*Wed.*Fri/)).toBeVisible();
  });

  test("should create day_of_week ECD via UI", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Gym");
    await page.getByRole("button", { name: "Weekly" }).click();

    // Select Mon, Wed, Fri
    await page.locator(".add-modal__dow-btn", { hasText: "Mon" }).click();
    await page.locator(".add-modal__dow-btn", { hasText: "Wed" }).click();
    await page.locator(".add-modal__dow-btn", { hasText: "Fri" }).click();

    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Gym");
    await expect(task.getByText(/↻.*Fri.*Mon.*Wed/)).toBeVisible();
  });

  test("should allow selecting single day of week", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Monday meeting");
    await page.getByRole("button", { name: "Weekly" }).click();

    // Mon is selected by default
    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Monday meeting");
    await expect(task.getByText("↻ Mon")).toBeVisible();
  });

  test("should toggle days on and off", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Task 1");
    await page.getByRole("button", { name: "Weekly" }).click();

    // Mon is selected by default, add Fri
    await page.locator(".add-modal__dow-btn", { hasText: "Fri" }).click();

    // Verify both are selected
    await expect(
      page.locator(".add-modal__dow-btn--active", { hasText: "Mon" }),
    ).toBeVisible();
    await expect(
      page.locator(".add-modal__dow-btn--active", { hasText: "Fri" }),
    ).toBeVisible();

    // Deselect Mon
    await page.locator(".add-modal__dow-btn", { hasText: "Mon" }).click();

    // Only Fri should be selected now
    await expect(
      page.locator(".add-modal__dow-btn--active", { hasText: "Mon" }),
    ).not.toBeVisible();
    await expect(
      page.locator(".add-modal__dow-btn--active", { hasText: "Fri" }),
    ).toBeVisible();
  });

  test("should not allow deselecting last day", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Task 1");
    await page.getByRole("button", { name: "Weekly" }).click();

    // Mon is selected by default, try to deselect it
    await page.locator(".add-modal__dow-btn", { hasText: "Mon" }).click();

    // Mon should still be selected
    await expect(
      page.locator(".add-modal__dow-btn--active", { hasText: "Mon" }),
    ).toBeVisible();
  });

  test("should edit day_of_week ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Team standup",
      headerId: header._id,
      ecd: { type: "day_of_week", value: ["Mon"] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Team standup");
    await task.getByTitle("Edit notes").click();

    // Add Wednesday
    await page.locator(".edit-modal__dow-btn", { hasText: "Wed" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText(/↻.*Mon.*Wed/)).toBeVisible();
  });

  test("should display all days of week", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Daily task",
      headerId: header._id,
      ecd: {
        type: "day_of_week",
        value: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Daily task");
    const ecdText = await task.locator(".task-card__ecd").textContent();

    expect(ecdText).toContain("Mon");
    expect(ecdText).toContain("Tue");
    expect(ecdText).toContain("Wed");
    expect(ecdText).toContain("Thu");
    expect(ecdText).toContain("Fri");
    expect(ecdText).toContain("Sat");
    expect(ecdText).toContain("Sun");
  });
});

test.describe("ECD - Day of Month Type", () => {
  test("should display day_of_month ECD with ordinal numbers", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Monthly report",
      headerId: header._id,
      ecd: { type: "day_of_month", value: [1, 15] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Monthly report");
    await expect(task.getByText(/↻.*1st.*15th/)).toBeVisible();
  });

  test("should create day_of_month ECD via UI", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Rent payment");
    await page.getByRole("button", { name: "Monthly" }).click();

    // Select 1st and 15th
    await page.locator(".add-modal__dom-btn", { hasText: /^1$/ }).click();
    await page.locator(".add-modal__dom-btn", { hasText: "15" }).click();

    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Rent payment");
    await expect(task.getByText(/↻.*1st.*15th/)).toBeVisible();
  });

  test("should show correct ordinal suffixes", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "day_of_month", value: [1, 2, 3, 21, 22, 23, 31] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    const ecdText = await task.locator(".task-card__ecd").textContent();

    expect(ecdText).toContain("1st");
    expect(ecdText).toContain("2nd");
    expect(ecdText).toContain("3rd");
    expect(ecdText).toContain("21st");
    expect(ecdText).toContain("22nd");
    expect(ecdText).toContain("23rd");
    expect(ecdText).toContain("31st");
  });

  test("should sort day_of_month values ascending", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "day_of_month", value: [15, 1, 30] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    await expect(task.getByText(/↻.*1st.*15th.*30th/)).toBeVisible();
  });

  test("should toggle day_of_month values", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Task 1");
    await page.getByRole("button", { name: "Monthly" }).click();

    // 1st is selected by default, add 15th
    await page.locator(".add-modal__dom-btn", { hasText: "15" }).click();

    // Verify both are selected
    await expect(
      page.locator(".add-modal__dom-btn--active", { hasText: /^1$/ }),
    ).toBeVisible();
    await expect(
      page.locator(".add-modal__dom-btn--active", { hasText: "15" }),
    ).toBeVisible();

    // Deselect 1st
    await page.locator(".add-modal__dom-btn", { hasText: /^1$/ }).click();

    // Only 15th should be selected now
    await expect(
      page.locator(".add-modal__dom-btn--active", { hasText: /^1$/ }),
    ).not.toBeVisible();
    await expect(
      page.locator(".add-modal__dom-btn--active", { hasText: "15" }),
    ).toBeVisible();
  });

  test("should not allow deselecting last day_of_month", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Task 1");
    await page.getByRole("button", { name: "Monthly" }).click();

    // 1st is selected by default, try to deselect it
    await page.locator(".add-modal__dom-btn", { hasText: /^1$/ }).click();

    // 1st should still be selected
    await expect(
      page.locator(".add-modal__dom-btn--active", { hasText: /^1$/ }),
    ).toBeVisible();
  });

  test("should edit day_of_month ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Monthly report",
      headerId: header._id,
      ecd: { type: "day_of_month", value: [1] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Monthly report");
    await task.getByTitle("Edit notes").click();

    // Add 15th
    await page.locator(".edit-modal__dom-btn", { hasText: "15" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText(/↻.*1st.*15th/)).toBeVisible();
  });
});

test.describe("ECD - Day of Year Type", () => {
  test("should display day_of_year ECD in D/M/YYYY format", async ({
    page,
  }) => {
    const header = await createHeader("Personal");
    await createTask({
      name: "Birthday",
      headerId: header._id,
      ecd: { type: "day_of_year", value: "25/12/2026" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Birthday");
    await expect(task.getByText("↻ 25/12/2026")).toBeVisible();
  });

  test("should create day_of_year ECD via UI", async ({ page }) => {
    const header = await createHeader("Personal");
    await page.reload();
    await waitForPageLoad(page);

    const personalHeader = page.locator(".readme-section", {
      hasText: "Personal",
    });
    await personalHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Anniversary");
    await page.getByRole("button", { name: "Yearly" }).click();

    // Navigate calendar two months forward from the current month
    for (let i = 0; i < 2; i++) {
      await page.getByLabel("Next month").click();
    }
    await expect(page.locator(".ecd-calendar__month-label")).toHaveText(
      calendarMonthLabel(2),
    );
    await page.locator(".ecd-calendar__day", { hasText: /^14$/ }).click();

    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Anniversary");
    await expect(task.getByText(yearlyEcdLabel(2, 14))).toBeVisible();
  });

  test("should edit day_of_year ECD", async ({ page }) => {
    const header = await createHeader("Personal");
    await createTask({
      name: "Birthday",
      headerId: header._id,
      ecd: { type: "day_of_year", value: "25/12/2026" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Birthday");
    await task.getByTitle("Edit notes").click();

    // Calendar opens on December 2026 (current ECD month). Navigate to January 2027.
    await page.getByLabel("Next month").click();
    await expect(page.locator(".ecd-calendar__month-label")).toHaveText(
      "January 2027",
    );
    await page.locator(".ecd-calendar__day", { hasText: /^1$/ }).click();

    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText("↻ 1/1/2027")).toBeVisible();
  });

  test("should default to today's month for new yearly ECD", async ({
    page,
  }) => {
    const header = await createHeader("Personal");
    await page.reload();
    await waitForPageLoad(page);

    const personalHeader = page.locator(".readme-section", {
      hasText: "Personal",
    });
    await personalHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Task 1");
    await page.getByRole("button", { name: "Yearly" }).click();

    // Calendar should open on current month with today highlighted
    const today = new Date();
    const expectedMonth = today.toLocaleString("en-US", { month: "long" });
    const expectedYear = today.getFullYear();
    await expect(page.locator(".ecd-calendar__month-label")).toHaveText(
      `${expectedMonth} ${expectedYear}`,
    );
    // Today's date should have the "today" class
    await expect(
      page.locator(".ecd-calendar__day--today", {
        hasText: String(today.getDate()),
      }),
    ).toBeVisible();
  });
});

test.describe("ECD - No Date", () => {
  test("should show 'No date' when ECD is null", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: null,
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    await expect(task.getByText("[ No date ]")).toBeVisible();
  });

  test("should select 'None' by default in add modal", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    const noneButton = page.locator(".add-modal__mode-btn--active", {
      hasText: "None",
    });
    await expect(noneButton).toBeVisible();
  });

  test("should create task with no ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    await workHeader.getByTitle("Add task").click();

    await page.getByPlaceholder("Task name…").fill("Task 1");
    // Don't select any ECD mode, leave on "None"
    await page.getByRole("button", { name: "Add task", exact: true }).click();

    const task = getTask(page, "Task 1");
    await expect(task.getByText("[ No date ]")).toBeVisible();
  });
});

test.describe("ECD - Type Conversion", () => {
  test("should convert from date to weekly ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "date", value: "2026-06-15" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    await task.getByTitle("Edit notes").click();

    // Change to weekly
    await page.getByRole("button", { name: "Weekly" }).click();
    await page.locator(".edit-modal__dow-btn", { hasText: "Mon" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText("↻ Mon")).toBeVisible();
  });

  test("should convert from weekly to monthly ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "day_of_week", value: ["Mon"] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    await task.getByTitle("Edit notes").click();

    // Change to monthly
    await page.getByRole("button", { name: "Monthly" }).click();
    await page.locator(".edit-modal__dom-btn", { hasText: /^1$/ }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText("↻ 1st")).toBeVisible();
  });

  test("should convert from monthly to yearly ECD", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "day_of_month", value: [1] },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    await task.getByTitle("Edit notes").click();

    // Change to yearly
    await page.getByRole("button", { name: "Yearly" }).click();

    // Calendar opens on the current month by default. Navigate two months forward.
    for (let i = 0; i < 2; i++) {
      await page.getByLabel("Next month").click();
    }
    await expect(page.locator(".ecd-calendar__month-label")).toHaveText(
      calendarMonthLabel(2),
    );
    await page.locator(".ecd-calendar__day", { hasText: /^1$/ }).click();

    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText(yearlyEcdLabel(2, 1))).toBeVisible();
  });

  test("should convert from any type to none", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Task 1",
      headerId: header._id,
      ecd: { type: "date", value: "2026-06-15" },
    });

    await page.reload();
    await waitForPageLoad(page);

    const task = getTask(page, "Task 1");
    await task.getByTitle("Edit notes").click();

    // Change to None
    await page.getByRole("button", { name: "None" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(task.getByText("[ No date ]")).toBeVisible();
  });
});
