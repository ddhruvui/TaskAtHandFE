/**
 * E2E tests for the Goals view (habit backlogs built one step at a time)
 */

import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  cleanGoals,
  createGoal,
  createHeader,
  createTask,
  deleteTaskViaUI,
  deleteHeaderViaUI,
  waitForPageLoad,
  getHeaders,
  getTaskNamesInHeader,
} from "./helpers";

const ONE_STEP_HEADER = "One Step At A Time";

async function openGoalsView(page: Page) {
  await page.locator(".goals-toggle-btn").click();
  await expect(page.locator(".goals-panel")).toBeVisible();
  await expect(page.getByText("Loading goals…")).not.toBeVisible();
}

function stepRow(page: Page, stepName: string) {
  return page.locator(".goals-panel__step-row", { hasText: stepName });
}

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await cleanGoals();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Goals - Panel", () => {
  test("should show empty state when no goals exist", async ({ page }) => {
    await openGoalsView(page);

    await expect(page.getByText("No goals yet — add one!")).toBeVisible();
  });

  test("should toggle goals button pressed state", async ({ page }) => {
    const btn = page.locator(".goals-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/goals-toggle-btn--active/);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".goals-panel")).not.toBeVisible();
  });
});

test.describe("Goals - Create", () => {
  test("should create a goal with steps via UI", async ({ page }) => {
    await openGoalsView(page);

    await page.getByRole("button", { name: "Add goal" }).click();
    await page
      .getByPlaceholder("Goal name… (e.g. Improve Health)")
      .fill("Improve Health");
    await page
      .locator(".goal-modal__textarea")
      .fill("Wake up at 6\nHave 1 fruit a day");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    const section = page.locator(".readme-section", {
      hasText: "Improve Health",
    });
    await expect(section).toBeVisible();
    await expect(section.locator(".goals-panel__step-name")).toHaveText([
      "Wake up at 6",
      "Have 1 fruit a day",
    ]);
    // New steps are pending: numbered markers and Start buttons
    await expect(section.locator(".goals-panel__step-marker")).toHaveText([
      "1",
      "2",
    ]);
    await expect(
      section.getByRole("button", { name: "Start" }),
    ).toHaveCount(2);
    await expect(page.getByText("No goals yet — add one!")).not.toBeVisible();
  });

  test("should update the step count hint while typing", async ({ page }) => {
    await openGoalsView(page);
    await page.getByRole("button", { name: "Add goal" }).click();

    await expect(page.getByText(/0 steps/)).toBeVisible();

    await page.locator(".goal-modal__textarea").fill("Wake up at 6");
    await expect(page.getByText(/1 step\b/)).toBeVisible();

    // Blank lines are ignored
    await page
      .locator(".goal-modal__textarea")
      .fill("Wake up at 6\n\n  \nHave 1 fruit a day");
    await expect(page.getByText(/2 steps/)).toBeVisible();
  });

  test("should allow creating a goal without steps", async ({ page }) => {
    await openGoalsView(page);
    await page.getByRole("button", { name: "Add goal" }).click();

    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    await expect(addBtn).toBeDisabled();

    await page
      .getByPlaceholder("Goal name… (e.g. Improve Health)")
      .fill("Better Finances");
    await expect(addBtn).toBeEnabled();
    await addBtn.click();

    const section = page.locator(".readme-section", {
      hasText: "Better Finances",
    });
    await expect(section).toBeVisible();
    await expect(
      page.getByText("No steps yet — edit the goal to list the small habits"),
    ).toBeVisible();
  });

  test("should cancel the add goal modal", async ({ page }) => {
    await openGoalsView(page);
    await page.getByRole("button", { name: "Add goal" }).click();
    await page
      .getByPlaceholder("Goal name… (e.g. Improve Health)")
      .fill("Improve Health");

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByPlaceholder("Goal name… (e.g. Improve Health)"),
    ).not.toBeVisible();
    await expect(page.getByText("No goals yet — add one!")).toBeVisible();
  });

  test("should close the add goal modal on Escape", async ({ page }) => {
    await openGoalsView(page);
    await page.getByRole("button", { name: "Add goal" }).click();

    await page
      .getByPlaceholder("Goal name… (e.g. Improve Health)")
      .press("Escape");

    await expect(
      page.getByPlaceholder("Goal name… (e.g. Improve Health)"),
    ).not.toBeVisible();
  });
});

test.describe("Goals - Update", () => {
  test("should edit a goal via UI and keep statuses of kept steps", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6", status: "under_progress" },
      { name: "Have 1 fruit a day" },
    ]);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Edit goal Improve Health" })
      .click();
    await expect(page.getByText("Edit Goal")).toBeVisible();

    const nameInput = page.getByPlaceholder("Goal name… (e.g. Improve Health)");
    await expect(nameInput).toHaveValue("Improve Health");
    await nameInput.fill("Get Healthy");
    await page
      .locator(".goal-modal__textarea")
      .fill("Wake up at 6\nHave 1 fruit a day\nExercise 10 min");
    await page.getByRole("button", { name: "Save" }).click();

    const section = page.locator(".readme-section", { hasText: "Get Healthy" });
    await expect(section).toBeVisible();
    await expect(section.locator(".goals-panel__step-name")).toHaveText([
      "Wake up at 6",
      "Have 1 fruit a day",
      "Exercise 10 min",
    ]);
    // The kept step is still under progress (∞ marker survives the edit)
    await expect(
      stepRow(page, "Wake up at 6").locator(".goals-panel__step-marker"),
    ).toHaveText("∞");
    await expect(page.getByText("1/3 under progress")).toBeVisible();
    await expect(
      page.locator(".readme-section", { hasText: "Improve Health" }),
    ).not.toBeVisible();
  });
});

test.describe("Goals - Delete", () => {
  test("should delete a goal with confirmation", async ({ page }) => {
    await createGoal("Improve Health", [{ name: "Wake up at 6" }]);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Delete goal Improve Health" })
      .click();
    await expect(
      page.getByText(
        'Delete goal "Improve Health"? Tasks already added to the todo stay.',
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("No goals yet — add one!")).toBeVisible();
  });

  test("should keep the goal when deletion is cancelled", async ({ page }) => {
    await createGoal("Improve Health", [{ name: "Wake up at 6" }]);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Delete goal Improve Health" })
      .click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.locator(".readme-section", { hasText: "Improve Health" }),
    ).toBeVisible();
  });
});

test.describe("Goals - One Step At A Time", () => {
  test("should start a step and add it as a daily task under the One Step At A Time header", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
    ]);
    await openGoalsView(page);

    await stepRow(page, "Wake up at 6")
      .getByRole("button", { name: "Start" })
      .click();

    await expect(
      page.getByText(`Started "Wake up at 6" — under progress as a daily habit`),
    ).toBeVisible();
    // Start puts the step straight under progress: ∞ marker + Pause action
    await expect(
      stepRow(page, "Wake up at 6").locator(".goals-panel__step-marker"),
    ).toHaveText("∞");
    await expect(
      stepRow(page, "Wake up at 6").getByRole("button", { name: "Pause" }),
    ).toBeVisible();
    // ...and raises the under-progress count right away
    await expect(page.getByText("1/2 under progress")).toBeVisible();

    // Switch back to the todo view and verify the task landed
    await page.locator(".goals-toggle-btn").click();
    const names = await getTaskNamesInHeader(page, ONE_STEP_HEADER);
    expect(names).toEqual(["Wake up at 6"]);
  });

  test("should reuse the One Step At A Time header when starting a second step", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
    ]);
    await openGoalsView(page);

    await stepRow(page, "Wake up at 6")
      .getByRole("button", { name: "Start" })
      .click();
    await expect(
      stepRow(page, "Wake up at 6").locator(".goals-panel__step-marker"),
    ).toHaveText("∞");

    await stepRow(page, "Have 1 fruit a day")
      .getByRole("button", { name: "Start" })
      .click();
    await expect(
      stepRow(page, "Have 1 fruit a day").locator(".goals-panel__step-marker"),
    ).toHaveText("∞");
    await expect(page.getByText("2/2 under progress")).toBeVisible();

    const headers = await getHeaders();
    const oneStepHeaders = headers.filter(
      (h: { name: string }) => h.name === ONE_STEP_HEADER,
    );
    expect(oneStepHeaders).toHaveLength(1);

    await page.locator(".goals-toggle-btn").click();
    // Starting a step triggers a background refetch of the todo; wait for it to
    // land rather than reading the header once and racing the reload.
    await expect(async () => {
      const names = await getTaskNamesInHeader(page, ONE_STEP_HEADER);
      expect(names).toEqual(["Wake up at 6", "Have 1 fruit a day"]);
    }).toPass({ timeout: 5000 });
  });

  test("should pause the step when its daily task is deleted from the todo", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
    ]);
    await openGoalsView(page);

    await stepRow(page, "Wake up at 6")
      .getByRole("button", { name: "Start" })
      .click();
    await expect(page.getByText("1/2 under progress")).toBeVisible();

    // Delete the daily task from the todo view like any other task
    await page.locator(".goals-toggle-btn").click();
    await deleteTaskViaUI(page, "Wake up at 6");

    // Back in the goals view the step has moved back to paused/pending
    await openGoalsView(page);
    await expect(
      stepRow(page, "Wake up at 6").getByRole("button", { name: "Start" }),
    ).toBeVisible();
    await expect(
      stepRow(page, "Wake up at 6").locator(".goals-panel__step-marker"),
    ).toHaveText("1");
    await expect(page.getByText("0/2 under progress")).toBeVisible();
  });

  test("should pause all started steps when the One Step At A Time header is deleted", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
    ]);
    await openGoalsView(page);

    await stepRow(page, "Wake up at 6")
      .getByRole("button", { name: "Start" })
      .click();
    await expect(page.getByText("1/2 under progress")).toBeVisible();
    await stepRow(page, "Have 1 fruit a day")
      .getByRole("button", { name: "Start" })
      .click();
    await expect(page.getByText("2/2 under progress")).toBeVisible();

    // Delete the whole header (and its daily tasks) from the todo view
    await page.locator(".goals-toggle-btn").click();
    await deleteHeaderViaUI(page, ONE_STEP_HEADER);

    // Every step is back to paused/pending
    await openGoalsView(page);
    await expect(page.getByText("0/2 under progress")).toBeVisible();
    await expect(
      page.locator(".goals-panel").getByRole("button", { name: "Start" }),
    ).toHaveCount(2);
  });

  test("should retire an under-progress habit via pause and remove its daily task", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6", status: "under_progress" },
    ]);
    // Seed the daily task the same way Start would have
    const header = await createHeader(ONE_STEP_HEADER);
    await createTask({
      name: "Wake up at 6",
      headerId: header._id,
      ecd: {
        type: "day_of_week",
        value: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      },
    });
    await page.reload();
    await openGoalsView(page);

    await expect(
      stepRow(page, "Wake up at 6").locator(".goals-panel__step-marker"),
    ).toHaveText("∞");
    await expect(page.getByText("1/1 under progress")).toBeVisible();
    await stepRow(page, "Wake up at 6")
      .getByRole("button", { name: "Pause" })
      .click();

    await expect(
      page.getByText(/paused — moved back to the backlog/),
    ).toBeVisible();
    await expect(
      stepRow(page, "Wake up at 6").getByRole("button", { name: "Start" }),
    ).toBeVisible();
    // Pausing lowers the under-progress count
    await expect(page.getByText("0/1 under progress")).toBeVisible();

    await page.locator(".goals-toggle-btn").click();
    const names = await getTaskNamesInHeader(page, ONE_STEP_HEADER);
    expect(names).toEqual([]);
  });

  test("should pause a step back to the backlog and remove its daily task", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Wake up at 6" }]);
    await openGoalsView(page);

    await stepRow(page, "Wake up at 6")
      .getByRole("button", { name: "Start" })
      .click();
    await expect(
      stepRow(page, "Wake up at 6").locator(".goals-panel__step-marker"),
    ).toHaveText("∞");
    await expect(page.getByText("1/1 under progress")).toBeVisible();

    await stepRow(page, "Wake up at 6")
      .getByRole("button", { name: "Pause" })
      .click();

    await expect(page.getByText(/paused — moved back to the backlog/)).toBeVisible();
    await expect(
      stepRow(page, "Wake up at 6").getByRole("button", { name: "Start" }),
    ).toBeVisible();
    // Pausing lowers the under-progress count
    await expect(page.getByText("0/1 under progress")).toBeVisible();

    await page.locator(".goals-toggle-btn").click();
    const names = await getTaskNamesInHeader(page, ONE_STEP_HEADER);
    expect(names).toEqual([]);
  });
});
