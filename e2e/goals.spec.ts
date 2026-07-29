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

/**
 * Step rows render like todo tasks: the lifecycle shows as a checkbox plus a
 * status badge in the slot the todo uses for the ECD, not as a numbered marker.
 */
function stepStatus(page: Page, stepName: string) {
  return stepRow(page, stepName).locator(".goals-panel__step-status");
}

const UNDER_PROGRESS = "[ ↻ Daily ]";
const NOT_STARTED = "[ Not started ]";

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
    // New steps are pending: unchecked boxes, "Not started" badge, Start action
    await expect(section.locator(".goals-panel__step-status")).toHaveText([
      NOT_STARTED,
      NOT_STARTED,
    ]);
    await expect(
      section.locator(".task-card__checkbox--checked"),
    ).toHaveCount(0);
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
    await expect(page.getByText("No steps yet — add one!")).toBeVisible();
  });

  test("should add a step from the goal heading like adding a task", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Wake up at 6" }]);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Add step to Improve Health" })
      .click();
    await expect(page.locator(".add-modal__title")).toHaveText(
      "Add step — Improve Health",
    );
    await page
      .getByPlaceholder("Step name… (e.g. Wake up at 6)")
      .fill("Have 1 fruit a day");
    await page.getByRole("button", { name: "Add step", exact: true }).click();

    const section = page.locator(".readme-section", {
      hasText: "Improve Health",
    });
    // Appended to the end of the backlog, pending like any new step
    await expect(section.locator(".goals-panel__step-name")).toHaveText([
      "Wake up at 6",
      "Have 1 fruit a day",
    ]);
    await expect(stepStatus(page, "Have 1 fruit a day")).toHaveText(
      NOT_STARTED,
    );
  });

  test("should add the first step to a goal that has none", async ({
    page,
  }) => {
    await createGoal("Better Finances", []);
    await openGoalsView(page);
    await expect(page.getByText("No steps yet — add one!")).toBeVisible();

    await page
      .getByRole("button", { name: "Add step to Better Finances" })
      .click();
    await page
      .getByPlaceholder("Step name… (e.g. Wake up at 6)")
      .fill("Track every expense");
    await page.getByRole("button", { name: "Add step", exact: true }).click();

    await expect(page.getByText("No steps yet — add one!")).not.toBeVisible();
    await expect(stepStatus(page, "Track every expense")).toHaveText(
      NOT_STARTED,
    );
  });

  test("should submit a new step on Enter", async ({ page }) => {
    await createGoal("Improve Health", []);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Add step to Improve Health" })
      .click();
    await page
      .getByPlaceholder("Step name… (e.g. Wake up at 6)")
      .fill("Walk 20 min");
    await page.getByPlaceholder("Step name… (e.g. Wake up at 6)").press("Enter");

    await expect(stepStatus(page, "Walk 20 min")).toHaveText(NOT_STARTED);
  });

  test("should not add a step when the name is blank", async ({ page }) => {
    await createGoal("Improve Health", []);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Add step to Improve Health" })
      .click();
    await expect(
      page.getByRole("button", { name: "Add step", exact: true }),
    ).toBeDisabled();

    await page.getByPlaceholder("Step name… (e.g. Wake up at 6)").fill("   ");
    await expect(
      page.getByRole("button", { name: "Add step", exact: true }),
    ).toBeDisabled();
  });

  test("should close the add step modal on Escape without adding", async ({
    page,
  }) => {
    await createGoal("Improve Health", []);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Add step to Improve Health" })
      .click();
    await page
      .getByPlaceholder("Step name… (e.g. Wake up at 6)")
      .fill("Discarded step");
    await page
      .getByPlaceholder("Step name… (e.g. Wake up at 6)")
      .press("Escape");

    await expect(
      page.getByPlaceholder("Step name… (e.g. Wake up at 6)"),
    ).not.toBeVisible();
    await expect(page.getByText("No steps yet — add one!")).toBeVisible();
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

test.describe("Goals - Ordering", () => {
  test("should move a goal up and down like a todo header", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Wake up at 6" }]);
    await createGoal("Better Finances", [{ name: "Track every expense" }]);
    await openGoalsView(page);

    const goalNames = page.locator(".goals-panel .readme-heading__text");
    // Goals are ordered by priority, i.e. creation order — not by name
    await expect(goalNames).toHaveText(["Improve Health", "Better Finances"]);

    await page
      .getByRole("button", { name: "Move goal Better Finances up" })
      .click();
    await expect(goalNames).toHaveText(["Better Finances", "Improve Health"]);

    await page
      .getByRole("button", { name: "Move goal Better Finances down" })
      .click();
    await expect(goalNames).toHaveText(["Improve Health", "Better Finances"]);
  });

  test("should disable the move arrows at the ends of the goal list", async ({
    page,
  }) => {
    await createGoal("Improve Health", []);
    await createGoal("Better Finances", []);
    await openGoalsView(page);

    await expect(
      page.getByRole("button", { name: "Move goal Improve Health up" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Move goal Better Finances down" }),
    ).toBeDisabled();
  });

  test("should keep the new goal order after a reload", async ({ page }) => {
    await createGoal("Improve Health", []);
    await createGoal("Better Finances", []);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Move goal Better Finances up" })
      .click();
    const goalNames = page.locator(".goals-panel .readme-heading__text");
    await expect(goalNames).toHaveText(["Better Finances", "Improve Health"]);

    await page.reload();
    await waitForPageLoad(page);
    await openGoalsView(page);
    await expect(goalNames).toHaveText(["Better Finances", "Improve Health"]);
  });

  test("should move a step up and down within its goal", async ({ page }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
      { name: "Walk 20 min" },
    ]);
    await openGoalsView(page);

    const steps = page.locator(".goals-panel__step-name");
    await expect(steps).toHaveText([
      "Wake up at 6",
      "Have 1 fruit a day",
      "Walk 20 min",
    ]);

    await page
      .getByRole("button", { name: "Move step Walk 20 min up" })
      .click();
    await expect(steps).toHaveText([
      "Wake up at 6",
      "Walk 20 min",
      "Have 1 fruit a day",
    ]);

    await page
      .getByRole("button", { name: "Move step Wake up at 6 down" })
      .click();
    await expect(steps).toHaveText([
      "Walk 20 min",
      "Wake up at 6",
      "Have 1 fruit a day",
    ]);
  });

  test("should disable step arrows at the ends of the step list", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
    ]);
    await openGoalsView(page);

    await expect(
      page.getByRole("button", { name: "Move step Wake up at 6 up" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Move step Have 1 fruit a day down" }),
    ).toBeDisabled();
  });

  test("should sort under-progress steps above the pending backlog", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
      { name: "Walk 20 min", status: "under_progress" },
    ]);
    await openGoalsView(page);

    // The started step renders first even though it was created last
    await expect(page.locator(".goals-panel__step-name")).toHaveText([
      "Walk 20 min",
      "Wake up at 6",
      "Have 1 fruit a day",
    ]);
  });

  test("should move a step to the top group when it starts", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
      { name: "Walk 20 min" },
    ]);
    await openGoalsView(page);

    await page.getByRole("button", { name: "Start step Walk 20 min" }).click();

    const steps = page.locator(".goals-panel__step-name");
    await expect(steps).toHaveText([
      "Walk 20 min",
      "Wake up at 6",
      "Have 1 fruit a day",
    ]);
    await expect(stepStatus(page, "Walk 20 min")).toHaveText(UNDER_PROGRESS);

    // Order survives a reload — the sorted list is what got persisted
    await page.reload();
    await waitForPageLoad(page);
    await openGoalsView(page);
    await expect(steps).toHaveText([
      "Walk 20 min",
      "Wake up at 6",
      "Have 1 fruit a day",
    ]);
  });

  test("should not move steps across the started/pending barrier", async ({
    page,
  }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6", status: "under_progress" },
      { name: "Have 1 fruit a day" },
    ]);
    await openGoalsView(page);

    // Neither row may cross the boundary between the started block and the
    // pending backlog below it
    await expect(
      page.getByRole("button", { name: "Move step Wake up at 6 down" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Move step Have 1 fruit a day up" }),
    ).toBeDisabled();
  });

  test("should not offer an Edit control on the goal heading", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Wake up at 6" }]);
    await openGoalsView(page);

    await expect(
      page.getByRole("button", { name: "Edit goal Improve Health" }),
    ).toHaveCount(0);
  });
});

test.describe("Goals - Delete step", () => {
  test("should delete a pending step after confirmation", async ({ page }) => {
    await createGoal("Improve Health", [
      { name: "Wake up at 6" },
      { name: "Have 1 fruit a day" },
    ]);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Delete step Have 1 fruit a day" })
      .click();
    await expect(
      page.getByText(
        'Delete step "Have 1 fruit a day" from "Improve Health"?',
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.locator(".goals-panel__step-name")).toHaveText([
      "Wake up at 6",
    ]);
  });

  test("should keep the step when the delete is cancelled", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Wake up at 6" }]);
    await openGoalsView(page);

    await page
      .getByRole("button", { name: "Delete step Wake up at 6" })
      .click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.locator(".goals-panel__step-name")).toHaveText([
      "Wake up at 6",
    ]);
  });

  test("should remove the daily task when an under-progress step is deleted", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Wake up at 6" }]);
    await openGoalsView(page);

    await stepRow(page, "Wake up at 6")
      .getByRole("button", { name: "Start" })
      .click();
    await expect(stepStatus(page, "Wake up at 6")).toHaveText(UNDER_PROGRESS);

    await page
      .getByRole("button", { name: "Delete step Wake up at 6" })
      .click();
    // The confirmation warns that the daily task goes too
    await expect(
      page.getByText(/Its daily task in "One Step At A Time" is removed too/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("No steps yet — add one!")).toBeVisible();

    // ...and the todo no longer carries the orphaned habit
    await page.locator(".goals-toggle-btn").click();
    await expect(async () => {
      const names = await getTaskNamesInHeader(page, ONE_STEP_HEADER);
      expect(names).toEqual([]);
    }).toPass({ timeout: 5000 });
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
    // Start puts the step straight under progress: checked box + Pause action
    await expect(stepStatus(page, "Wake up at 6")).toHaveText(UNDER_PROGRESS);
    await expect(
      stepRow(page, "Wake up at 6").locator(".task-card__checkbox--checked"),
    ).toBeVisible();
    await expect(
      stepRow(page, "Wake up at 6").getByRole("button", { name: "Pause" }),
    ).toBeVisible();
    // ...and raises the under-progress count right away
    await expect(page.getByText("1/2 under progress")).toBeVisible();

    // Switch back to the todo view and verify the task landed. Starting a
    // step triggers a background refetch of the todo; wait for it to land
    // rather than reading the header once and racing the reload.
    await page.locator(".goals-toggle-btn").click();
    await expect(async () => {
      const names = await getTaskNamesInHeader(page, ONE_STEP_HEADER);
      expect(names).toEqual(["Wake up at 6"]);
    }).toPass({ timeout: 5000 });
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
    await expect(stepStatus(page, "Wake up at 6")).toHaveText(UNDER_PROGRESS);

    await stepRow(page, "Have 1 fruit a day")
      .getByRole("button", { name: "Start" })
      .click();
    await expect(stepStatus(page, "Have 1 fruit a day")).toHaveText(
      UNDER_PROGRESS,
    );
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
    await expect(stepStatus(page, "Wake up at 6")).toHaveText(NOT_STARTED);
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

    await expect(stepStatus(page, "Wake up at 6")).toHaveText(UNDER_PROGRESS);
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
    await expect(stepStatus(page, "Wake up at 6")).toHaveText(UNDER_PROGRESS);
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
