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
  getTask,
  getTasks,
  getTaskNamesInHeader,
  toggleTaskDone,
  runCron,
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

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The day picker that Start and "Change days" both open. */
function daysModal(page: Page) {
  return page.locator(".add-modal");
}

/**
 * Pick exactly `days` in an open day picker. Starts from the "Every day"
 * preset so the selection is absolute rather than relative to whatever the
 * step already had.
 */
async function pickDays(page: Page, days: string[]) {
  const modal = daysModal(page);
  await modal.getByRole("button", { name: "Every day" }).click();
  for (const day of ALL_DAYS) {
    if (!days.includes(day)) {
      await modal.getByRole("button", { name: `Toggle ${day}` }).click();
    }
  }
}

/**
 * Start a step through the day picker its checkbox now opens. Omitting `days`
 * confirms the default (all seven), which is what starting a step did
 * implicitly before the days were selectable.
 */
async function startStep(page: Page, stepName: string, days?: string[]) {
  await stepRow(page, stepName)
    .getByRole("button", { name: `Start step ${stepName}` })
    .click();
  await expect(daysModal(page)).toBeVisible();
  if (days) await pickDays(page, days);
  await daysModal(page)
    .getByRole("button", { name: "Start step", exact: true })
    .click();
  await expect(daysModal(page)).toBeHidden();
}

/** Reschedule an already-started step through the same picker. */
async function changeStepDays(page: Page, stepName: string, days: string[]) {
  await stepRow(page, stepName)
    .getByRole("button", { name: `Change days for step ${stepName}` })
    .click();
  await expect(daysModal(page)).toBeVisible();
  await pickDays(page, days);
  await daysModal(page).getByRole("button", { name: "Save days" }).click();
  await expect(daysModal(page)).toBeHidden();
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

    await startStep(page, "Walk 20 min");

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

    await startStep(page, "Wake up at 6");
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

    await startStep(page, "Wake up at 6");

    await expect(
      page.getByText(
        `Started "Wake up at 6" — under progress every Sun, Mon, Tue, Wed, Thu, Fri, Sat`,
      ),
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

    await startStep(page, "Wake up at 6");
    await expect(stepStatus(page, "Wake up at 6")).toHaveText(UNDER_PROGRESS);

    await startStep(page, "Have 1 fruit a day");
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

    await startStep(page, "Wake up at 6");
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

    await startStep(page, "Wake up at 6");
    await expect(page.getByText("1/2 under progress")).toBeVisible();
    await startStep(page, "Have 1 fruit a day");
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

    await startStep(page, "Wake up at 6");
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

test.describe("Goals - Habit days", () => {
  /** The ECD of the started step's task, straight from the API. */
  async function oneStepTaskEcd(taskName: string) {
    const headers = await getHeaders();
    const header = headers.find(
      (h: { name: string }) => h.name === ONE_STEP_HEADER,
    );
    if (!header) return null;
    const tasks = await getTasks(header._id);
    const task = tasks.find((t: { name: string }) => t.name === taskName);
    return task ? task.ecd : null;
  }

  test("should start a step only on the days picked in the modal", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);

    await startStep(page, "Gym", ["Mon", "Wed", "Fri"]);

    // The badge lists the days instead of collapsing to "Daily"
    await expect(stepStatus(page, "Gym")).toHaveText("[ ↻ Mon, Wed, Fri ]");
    await expect(
      page.getByText(`Started "Gym" — under progress every Mon, Wed, Fri`),
    ).toBeVisible();

    // ...and the habit's task carries exactly those days, in week order
    await expect(async () => {
      expect(await oneStepTaskEcd("Gym")).toEqual({
        type: "day_of_week",
        value: ["Mon", "Wed", "Fri"],
      });
    }).toPass({ timeout: 5000 });
  });

  test("should show the picked days on the habit's todo task too", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);
    await startStep(page, "Gym", ["Sat", "Sun"]);

    await page.locator(".goals-toggle-btn").click();
    // Week order is Sunday-first, matching what the backend stores
    await expect(getTask(page, "Gym").locator(".task-card__ecd")).toHaveText(
      "[ ↻ Sun, Sat ]",
    );
  });

  test("should default the picker to every day", async ({ page }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);

    await stepRow(page, "Gym")
      .getByRole("button", { name: "Start step Gym" })
      .click();
    await expect(
      daysModal(page).getByText(
        "Due every Sun, Mon, Tue, Wed, Thu, Fri, Sat",
      ),
    ).toBeVisible();
    for (const day of ALL_DAYS) {
      await expect(
        daysModal(page).getByRole("button", { name: `Toggle ${day}` }),
      ).toHaveAttribute("aria-pressed", "true");
    }

    await daysModal(page)
      .getByRole("button", { name: "Start step", exact: true })
      .click();
    // The full week collapses back to the "Daily" badge
    await expect(stepStatus(page, "Gym")).toHaveText(UNDER_PROGRESS);
  });

  test("should offer weekday and weekend presets", async ({ page }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);

    await stepRow(page, "Gym")
      .getByRole("button", { name: "Start step Gym" })
      .click();
    await daysModal(page).getByRole("button", { name: "Weekdays" }).click();
    await daysModal(page)
      .getByRole("button", { name: "Start step", exact: true })
      .click();

    await expect(stepStatus(page, "Gym")).toHaveText(
      "[ ↻ Mon, Tue, Wed, Thu, Fri ]",
    );
  });

  test("should not let a step start with no day selected", async ({ page }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);

    await stepRow(page, "Gym")
      .getByRole("button", { name: "Start step Gym" })
      .click();
    for (const day of ALL_DAYS) {
      await daysModal(page)
        .getByRole("button", { name: `Toggle ${day}` })
        .click();
    }

    await expect(
      daysModal(page).getByText("Pick at least one day"),
    ).toBeVisible();
    await expect(
      daysModal(page).getByRole("button", { name: "Start step", exact: true }),
    ).toBeDisabled();
  });

  test("should leave the step pending when the picker is cancelled", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);

    await stepRow(page, "Gym")
      .getByRole("button", { name: "Start step Gym" })
      .click();
    await daysModal(page).getByRole("button", { name: "Cancel" }).click();

    await expect(daysModal(page)).toBeHidden();
    await expect(stepStatus(page, "Gym")).toHaveText(NOT_STARTED);
    await expect(page.getByText("0/1 under progress")).toBeVisible();
    expect(await oneStepTaskEcd("Gym")).toBeNull();
  });

  test("should not offer a days control on a pending step", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);

    await expect(
      stepRow(page, "Gym").getByRole("button", {
        name: "Change days for step Gym",
      }),
    ).toHaveCount(0);
  });

  test("should change a started step's days and rewrite its task ECD", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);
    await startStep(page, "Gym", ["Mon", "Wed", "Fri"]);

    await changeStepDays(page, "Gym", ["Tue", "Thu"]);

    await expect(stepStatus(page, "Gym")).toHaveText("[ ↻ Tue, Thu ]");
    await expect(
      page.getByText(`"Gym" is now due every Tue, Thu`),
    ).toBeVisible();
    await expect(async () => {
      expect(await oneStepTaskEcd("Gym")).toEqual({
        type: "day_of_week",
        value: ["Tue", "Thu"],
      });
    }).toPass({ timeout: 5000 });
  });

  test("should keep the chosen days after a reload", async ({ page }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);
    await startStep(page, "Gym", ["Mon", "Wed", "Fri"]);

    await page.reload();
    await waitForPageLoad(page);
    await openGoalsView(page);

    await expect(stepStatus(page, "Gym")).toHaveText("[ ↻ Mon, Wed, Fri ]");
  });

  test("should restore the chosen days when a paused step is started again", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Gym" }]);
    await openGoalsView(page);
    await startStep(page, "Gym", ["Mon", "Wed", "Fri"]);

    await stepRow(page, "Gym").getByRole("button", { name: "Pause" }).click();
    await expect(stepStatus(page, "Gym")).toHaveText(NOT_STARTED);

    // Pausing keeps the schedule on the step, so the picker reopens on it
    await stepRow(page, "Gym")
      .getByRole("button", { name: "Start step Gym" })
      .click();
    await expect(
      daysModal(page).getByText("Due every Mon, Wed, Fri"),
    ).toBeVisible();
    await daysModal(page)
      .getByRole("button", { name: "Start step", exact: true })
      .click();

    await expect(stepStatus(page, "Gym")).toHaveText("[ ↻ Mon, Wed, Fri ]");
  });
});

test.describe("Goals - Habit streak", () => {
  /**
   * Streaks come from the nightly archive, which only records a result for a
   * task on the days its ECD covers — so these run the cron once to produce
   * yesterday's outcome. Step names are unique per test because the archive
   * is not wiped between tests and habits are matched by name.
   */
  test("should show a zero streak for a habit missed yesterday", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Streak miss habit" }]);
    await openGoalsView(page);
    await startStep(page, "Streak miss habit");

    // Never ticked off, so last night's run archives it as a miss
    await runCron();
    await page.reload();
    await waitForPageLoad(page);
    await openGoalsView(page);

    await expect(
      stepRow(page, "Streak miss habit").locator(".goals-panel__step-streak"),
    ).toHaveText("🔥 0");
  });

  test("should count a day the habit was completed", async ({ page }) => {
    await createGoal("Improve Health", [{ name: "Streak hit habit" }]);
    await openGoalsView(page);
    await startStep(page, "Streak hit habit");

    // Tick it off in the todo, then let the nightly run score the day. The
    // cron reads the task straight from the DB, so wait for the done write to
    // land before triggering it rather than racing the refetch.
    await page.locator(".goals-toggle-btn").click();
    await expect(getTask(page, "Streak hit habit")).toBeVisible();
    await toggleTaskDone(page, "Streak hit habit");
    await expect(getTask(page, "Streak hit habit")).toHaveClass(
      /task-card--done/,
    );
    await runCron();

    await page.reload();
    await waitForPageLoad(page);
    await openGoalsView(page);

    await expect(
      stepRow(page, "Streak hit habit").locator(".goals-panel__step-streak"),
    ).toHaveText("🔥 1");
  });

  test("should not show a streak on a pending step", async ({ page }) => {
    await createGoal("Improve Health", [{ name: "Streak pending habit" }]);
    await openGoalsView(page);

    await expect(
      stepRow(page, "Streak pending habit").locator(
        ".goals-panel__step-streak",
      ),
    ).toHaveCount(0);
  });

  test("should show the same streak on the habit's task in the todo", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Streak todo habit" }]);
    await openGoalsView(page);
    await startStep(page, "Streak todo habit");

    // Tick it off in the todo, then let the nightly run score the day
    await page.locator(".goals-toggle-btn").click();
    await expect(getTask(page, "Streak todo habit")).toBeVisible();
    await toggleTaskDone(page, "Streak todo habit");
    await expect(getTask(page, "Streak todo habit")).toHaveClass(
      /task-card--done/,
    );
    await runCron();

    await page.reload();
    await waitForPageLoad(page);

    // The habit's card under "One Step At A Time" carries the badge…
    await expect(
      getTask(page, "Streak todo habit").locator(".task-card__streak"),
    ).toHaveText("🔥 1");

    // …reading the same as the step it belongs to in the Goals view
    await openGoalsView(page);
    await expect(
      stepRow(page, "Streak todo habit").locator(".goals-panel__step-streak"),
    ).toHaveText("🔥 1");
  });

  test("should show the habit's streak in the By Date view too", async ({
    page,
  }) => {
    await createGoal("Improve Health", [{ name: "Streak bydate habit" }]);
    await openGoalsView(page);
    await startStep(page, "Streak bydate habit");

    await page.locator(".goals-toggle-btn").click();
    await expect(getTask(page, "Streak bydate habit")).toBeVisible();
    await toggleTaskDone(page, "Streak bydate habit");
    await expect(getTask(page, "Streak bydate habit")).toHaveClass(
      /task-card--done/,
    );
    await runCron();

    await page.reload();
    await waitForPageLoad(page);
    // Done tasks are dropped from By Date, so untick it first — the streak is
    // the archive's, not today's checkbox
    await toggleTaskDone(page, "Streak bydate habit");
    await expect(getTask(page, "Streak bydate habit")).not.toHaveClass(
      /task-card--done/,
    );
    await page.locator(".bydate-toggle-btn").click();

    await expect(
      getTask(page, "Streak bydate habit").locator(".task-card__streak"),
    ).toHaveText("🔥 1");
  });

  test("should not show a streak on an ordinary task", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Ordinary task", headerId: header._id });
    await page.reload();
    await waitForPageLoad(page);

    await expect(
      getTask(page, "Ordinary task").locator(".task-card__streak"),
    ).toHaveCount(0);
  });
});
