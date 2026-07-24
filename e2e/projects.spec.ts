/**
 * E2E tests for the Projects view (long-term projects built step by step)
 * and its sync with the todo: a dated project task lives in the todo under
 * a header named after the project until the cron completes it.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  cleanProjects,
  createProject,
  createHeader,
  createTask,
  deleteTaskViaUI,
  getHeaders,
  getTasks,
  getProjects,
  runCron,
  toggleTaskDone,
  waitForPageLoad,
  dateKey,
} from "./helpers";

async function openProjectsView(page: Page) {
  await page.locator(".projects-toggle-btn").click();
  await expect(page.locator(".projects-panel")).toBeVisible();
  await expect(page.getByText("Loading projects…")).not.toBeVisible();
}

function taskRow(page: Page, taskName: string) {
  return page.locator(".projects-panel__task-row", { hasText: taskName });
}

/** Add a task via the panel UI; date is optional (YYYY-MM-DD, must be in the currently shown month). */
async function addProjectTaskViaUI(
  page: Page,
  projectName: string,
  taskName: string,
  withDate?: number, // day of the current month to click
) {
  await page
    .getByRole("button", { name: `Add task to ${projectName}` })
    .click();
  await page.getByPlaceholder("Task name…").fill(taskName);
  if (withDate !== undefined) {
    await page
      .getByRole("button", { name: "Date", exact: true })
      .click();
    await page
      .locator(".ecd-calendar__day", {
        hasText: new RegExp(`^${withDate}$`),
      })
      .click();
  }
  await page.getByRole("button", { name: "Add task", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await cleanProjects();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Projects - Panel", () => {
  test("should show empty state when no projects exist", async ({ page }) => {
    await openProjectsView(page);

    await expect(page.getByText("No projects yet — add one!")).toBeVisible();
  });

  test("should toggle projects button pressed state", async ({ page }) => {
    const btn = page.locator(".projects-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/projects-toggle-btn--active/);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".projects-panel")).not.toBeVisible();
  });
});

test.describe("Projects - Create & order", () => {
  test("should create a project via UI", async ({ page }) => {
    await openProjectsView(page);

    await page.getByRole("button", { name: "Add project" }).click();
    await page.getByPlaceholder("Project name…").fill("Automated Stock Market");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    const section = page.locator(".readme-section", {
      hasText: "Automated Stock Market",
    });
    await expect(section).toBeVisible();
    await expect(
      section.getByText("No tasks yet — add the steps that get this project done."),
    ).toBeVisible();
  });

  test("should reorder projects with move up/down", async ({ page }) => {
    await createProject("Project A");
    await createProject("Project B");
    await openProjectsView(page);

    const headings = page.locator(".projects-panel .readme-heading__text");
    await expect(headings).toHaveText(["Project A", "Project B"]);

    await page
      .getByRole("button", { name: "Move project Project B up" })
      .click();
    await expect(headings).toHaveText(["Project B", "Project A"]);

    const projects = await getProjects();
    expect(projects.map((p: { name: string }) => p.name)).toEqual([
      "Project B",
      "Project A",
    ]);
  });

  test("should delete a project and leave its todo tasks alone", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const todoTask = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(1), todoTaskId: todoTask._id },
    ]);
    await openProjectsView(page);

    await page
      .getByRole("button", { name: "Delete project Automated Stock Market" })
      .click();
    await expect(
      page.getByText(
        'Delete project "Automated Stock Market"? Tasks already added to the todo stay.',
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("No projects yet — add one!")).toBeVisible();
    const tasks = await getTasks(header._id);
    expect(tasks.map((t: { name: string }) => t.name)).toContain(
      "get data from EODHD",
    );
  });
});

test.describe("Projects - Tasks", () => {
  test("should add an undated task (panel only, no todo entry)", async ({
    page,
  }) => {
    await createProject("Automated Stock Market");
    await openProjectsView(page);

    await addProjectTaskViaUI(page, "Automated Stock Market", "deploy to cpu");

    await expect(taskRow(page, "deploy to cpu")).toBeVisible();
    await expect(
      taskRow(page, "deploy to cpu").locator(".projects-panel__task-date"),
    ).not.toBeVisible();
    // No header was created in the todo
    const headers = await getHeaders();
    expect(headers).toHaveLength(0);
  });

  test("should mirror a dated task into the todo under the project header", async ({
    page,
  }) => {
    await createProject("Automated Stock Market");
    await openProjectsView(page);

    const day = new Date().getDate();
    await addProjectTaskViaUI(
      page,
      "Automated Stock Market",
      "get data from EODHD",
      day,
    );

    await expect(taskRow(page, "get data from EODHD")).toBeVisible();
    await expect(
      taskRow(page, "get data from EODHD").locator(
        ".projects-panel__task-date",
      ),
    ).toBeVisible();

    // The todo now has a header named after the project with the task in it
    const headers = await getHeaders();
    expect(headers.map((h: { name: string }) => h.name)).toEqual([
      "Automated Stock Market",
    ]);
    const tasks = await getTasks(headers[0]._id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe("get data from EODHD");
    expect(tasks[0].ecd).toEqual({ type: "date", value: dateKey(0) });

    // The project task is linked to the created todo task
    const projects = await getProjects();
    expect(projects[0].tasks[0].todoTaskId).toBe(tasks[0]._id);

    // And it shows in the main todo view under the project header
    await page.locator(".projects-toggle-btn").click();
    const todoSection = page.locator(".readme-section", {
      hasText: "Automated Stock Market",
    });
    await expect(todoSection.getByText("get data from EODHD")).toBeVisible();
  });

  test("should reuse an existing header (case-insensitive) for dated tasks", async ({
    page,
  }) => {
    await createHeader("automated stock market");
    await createProject("Automated Stock Market");
    await page.reload();
    await waitForPageLoad(page);
    await openProjectsView(page);

    const day = new Date().getDate();
    await addProjectTaskViaUI(
      page,
      "Automated Stock Market",
      "get data from EODHD",
      day,
    );
    await expect(taskRow(page, "get data from EODHD")).toBeVisible();

    const headers = await getHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0].name).toBe("automated stock market");
  });

  test("should move done tasks to the bottom when toggled in the panel", async ({
    page,
  }) => {
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD" },
      { name: "get data from Nasdaq" },
      { name: "deploy to cpu" },
    ]);
    await openProjectsView(page);

    await page
      .getByRole("button", { name: "Toggle task get data from EODHD" })
      .click();

    await expect(
      page.locator(".projects-panel__task-name"),
    ).toHaveText([
      "get data from Nasdaq",
      "deploy to cpu",
      "get data from EODHD",
    ]);
    await expect(taskRow(page, "get data from EODHD")).toHaveClass(
      /projects-panel__task-row--done/,
    );
    // Progress badge reflects the change
    await expect(page.getByText("1/3 done")).toBeVisible();
  });

  test("should mark the linked todo task done when toggled in the panel", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const todoTask = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(1), todoTaskId: todoTask._id },
    ]);
    await page.reload();
    await waitForPageLoad(page);
    await openProjectsView(page);

    await page
      .getByRole("button", { name: "Toggle task get data from EODHD" })
      .click();
    await expect(taskRow(page, "get data from EODHD")).toHaveClass(
      /projects-panel__task-row--done/,
    );

    const tasks = await getTasks(header._id);
    expect(tasks[0].done).toBe(true);
  });

  test("should mark the project task done when its todo task is toggled in the todo", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const todoTask = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(1), todoTaskId: todoTask._id },
      { name: "get data from Nasdaq" },
    ]);
    await page.reload();
    await waitForPageLoad(page);

    await toggleTaskDone(page, "get data from EODHD");

    // The todo→project sync runs after the toggle; wait for it to land
    // before mounting the panel (it loads projects once on open)
    await expect
      .poll(async () => {
        const projects = await getProjects();
        return projects[0].tasks.find(
          (t: { name: string }) => t.name === "get data from EODHD",
        )?.done;
      })
      .toBe(true);

    await openProjectsView(page);
    await expect(taskRow(page, "get data from EODHD")).toHaveClass(
      /projects-panel__task-row--done/,
    );
    // Done task re-sorted to the bottom of the project
    await expect(page.locator(".projects-panel__task-name")).toHaveText([
      "get data from Nasdaq",
      "get data from EODHD",
    ]);
  });

  test("should reorder tasks with move up/down but not across the done barrier", async ({
    page,
  }) => {
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD" },
      { name: "get data from Nasdaq" },
      { name: "deploy to cpu", done: true },
    ]);
    await openProjectsView(page);

    await page
      .getByRole("button", { name: "Move task get data from Nasdaq up" })
      .click();
    await expect(page.locator(".projects-panel__task-name")).toHaveText([
      "get data from Nasdaq",
      "get data from EODHD",
      "deploy to cpu",
    ]);

    // The last undone task cannot move down into the done zone,
    // and the done task's moves are disabled at the barrier too
    await expect(
      page.getByRole("button", { name: "Move task get data from EODHD down" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Move task deploy to cpu up" }),
    ).toBeDisabled();
  });

  test("should delete the linked todo task when the project task is deleted", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const todoTask = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(1), todoTaskId: todoTask._id },
    ]);
    await page.reload();
    await waitForPageLoad(page);
    await openProjectsView(page);

    await page
      .getByRole("button", { name: "Delete task get data from EODHD" })
      .click();
    await expect(
      page.getByText(/Its todo entry is removed too\./),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(taskRow(page, "get data from EODHD")).not.toBeVisible();
    const tasks = await getTasks(header._id);
    expect(tasks).toHaveLength(0);
  });

  test("should unlink the project task when its todo task is deleted from the todo", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const todoTask = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(1), todoTaskId: todoTask._id },
    ]);
    await page.reload();
    await waitForPageLoad(page);

    // Delete the todo task from the todo view (undone → needs a reason)
    await deleteTaskViaUI(page, "get data from EODHD", "changed plans");
    await expect(
      page.locator(".task-card", { hasText: "get data from EODHD" }),
    ).not.toBeVisible();

    // The project task lost both its link and its date
    const projects = await getProjects();
    expect(projects[0].tasks[0]).toEqual({
      name: "get data from EODHD",
      date: null,
      done: false,
      todoTaskId: null,
    });
  });
});

test.describe("Projects - Todo edit & order sync", () => {
  test("should update the project task date when the linked todo task's date is edited", async ({
    page,
  }) => {
    // Needs an earlier day in the same month to avoid the postpone flow
    test.skip(new Date().getDate() === 1, "no earlier day this month");

    const header = await createHeader("Automated Stock Market");
    const todoTask = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(0), todoTaskId: todoTask._id },
    ]);
    await page.reload();
    await waitForPageLoad(page);

    // Edit the todo task's date to the 1st of the current month
    const task = page.locator(".task-card", { hasText: "get data from EODHD" });
    await task.getByTitle("Edit notes").click();
    await page.locator(".ecd-calendar__day", { hasText: /^1$/ }).click();
    await page.getByRole("button", { name: "Save" }).click();

    const firstOfMonth = dateKey(1 - new Date().getDate());
    await expect
      .poll(async () => (await getProjects())[0].tasks[0].date)
      .toBe(firstOfMonth);
    const projects = await getProjects();
    expect(projects[0].tasks[0].todoTaskId).toBe(todoTask._id);
  });

  test("should clear the project task date when the todo task's date is removed", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const todoTask = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(1), todoTaskId: todoTask._id },
    ]);
    await page.reload();
    await waitForPageLoad(page);

    // Clear the date from the todo side (Due → None)
    const task = page.locator(".task-card", { hasText: "get data from EODHD" });
    await task.getByTitle("Edit notes").click();
    await page.getByRole("button", { name: "None", exact: true }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(async () => (await getProjects())[0].tasks[0].date)
      .toBeNull();
    // The link is kept — only the date is gone
    const projects = await getProjects();
    expect(projects[0].tasks[0].todoTaskId).toBe(todoTask._id);
  });

  test("should mirror a project task reorder into the todo", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const t1 = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    const t2 = await createTask({
      name: "get data from Nasdaq",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(2) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(1), todoTaskId: t1._id },
      { name: "get data from Nasdaq", date: dateKey(2), todoTaskId: t2._id },
    ]);
    await page.reload();
    await waitForPageLoad(page);
    await openProjectsView(page);

    await page
      .getByRole("button", { name: "Move task get data from Nasdaq up" })
      .click();
    await expect(page.locator(".projects-panel__task-name")).toHaveText([
      "get data from Nasdaq",
      "get data from EODHD",
    ]);

    // The linked todo tasks swapped priorities too
    await expect
      .poll(async () =>
        (await getTasks(header._id)).map((t: { name: string }) => t.name),
      )
      .toEqual(["get data from Nasdaq", "get data from EODHD"]);
  });

  test("should mirror a todo reorder of linked tasks into the project", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const t1 = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(1) },
    });
    const t2 = await createTask({
      name: "get data from Nasdaq",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(2) },
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(1), todoTaskId: t1._id },
      { name: "get data from Nasdaq", date: dateKey(2), todoTaskId: t2._id },
    ]);
    await page.reload();
    await waitForPageLoad(page);

    // Move the second todo task up in the todo view
    await page
      .locator(".task-card", { hasText: "get data from Nasdaq" })
      .getByTitle("Move up")
      .click();

    await expect
      .poll(async () =>
        (await getProjects())[0].tasks.map((t: { name: string }) => t.name),
      )
      .toEqual(["get data from Nasdaq", "get data from EODHD"]);
  });
});

test.describe("Projects - Cron completion", () => {
  test("done dated task leaves the todo but is retained as done in the project", async ({
    page,
  }) => {
    const header = await createHeader("Automated Stock Market");
    const todoTask = await createTask({
      name: "get data from EODHD",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-1) },
      done: true,
    });
    await createProject("Automated Stock Market", [
      { name: "get data from EODHD", date: dateKey(-1), todoTaskId: todoTask._id },
      { name: "get data from Nasdaq" },
    ]);

    const stats = await runCron();
    expect(stats.projectTasksCompleted).toBe(1);

    // Gone from the todo
    const tasks = await getTasks(header._id);
    expect(tasks).toHaveLength(0);

    // Retained in the project: done, date kept, link consumed, at the bottom
    const projects = await getProjects();
    expect(projects[0].tasks).toEqual([
      { name: "get data from Nasdaq", date: null, done: false, todoTaskId: null },
      {
        name: "get data from EODHD",
        date: dateKey(-1),
        done: true,
        todoTaskId: null,
      },
    ]);

    await page.reload();
    await waitForPageLoad(page);
    await openProjectsView(page);
    await expect(taskRow(page, "get data from EODHD")).toHaveClass(
      /projects-panel__task-row--done/,
    );
    await expect(page.getByText("1/2 done")).toBeVisible();
  });
});
