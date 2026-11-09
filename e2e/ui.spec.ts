/**
 * UI shell & design-system behaviour: sidebar navigation, page headers,
 * colour theme, due-date flags, hover-revealed row actions, shared dialog
 * behaviour, the dismissible action error, By Date labels and the phone
 * layout. Feature flows live in their own specs; this file covers what the
 * redesign added around them.
 */

import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createHeader,
  createTask,
  dateKey,
  getTask,
  toggleTaskDone,
  waitForPageLoad,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await page.goto("/");
  await waitForPageLoad(page);
});

const pageTitle = (page: import("@playwright/test").Page) =>
  page.locator(".page-header__title");

test.describe("UI - App shell", () => {
  test("should show the brand and every view in the sidebar, in order", async ({
    page,
  }) => {
    await expect(page.locator("h1", { hasText: "Task At Hand" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Views" });
    await expect(nav.locator(".app-nav__label")).toHaveText([
      "Tasks",
      "By date",
      "Insights",
      "Projects",
      "Goals",
      "Events",
      "Life events",
      "Calls",
      "Affirmations",
      "Vacation",
      "On-call",
    ]);
    await expect(nav.locator(".app-nav__group-label")).toHaveText([
      "Plan",
      "Life",
      "Time off",
    ]);
  });

  test("should open on Tasks, marked current and titled", async ({ page }) => {
    await expect(page.locator(".tasks-nav-btn")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(pageTitle(page)).toHaveText("Tasks");
  });

  test("should retitle the page for a panel and return to Tasks on a second click", async ({
    page,
  }) => {
    const goals = page.locator(".goals-toggle-btn");
    await goals.click();
    await expect(pageTitle(page)).toHaveText("Goals");
    await expect(goals).toHaveClass(/app-nav__item--current/);
    await expect(page.locator(".tasks-nav-btn")).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    await goals.click();
    await expect(pageTitle(page)).toHaveText("Tasks");
    await expect(goals).not.toHaveClass(/app-nav__item--current/);
  });

  test("should go back to the task list from a panel via Tasks", async ({
    page,
  }) => {
    await page.locator(".calls-toggle-btn").click();
    await expect(page.locator(".calls-panel")).toBeVisible();

    await page.locator(".tasks-nav-btn").click();
    await expect(page.locator(".calls-panel")).not.toBeVisible();
    await expect(pageTitle(page)).toHaveText("Tasks");
    await expect(page.locator(".calls-toggle-btn")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("should open the todo grouped by date when By date is clicked from a panel", async ({
    page,
  }) => {
    await page.locator(".goals-toggle-btn").click();
    await expect(page.locator(".goals-panel")).toBeVisible();

    const byDate = page.locator(".bydate-toggle-btn");
    await byDate.click();
    await expect(page.locator(".goals-panel")).not.toBeVisible();
    await expect(pageTitle(page)).toHaveText("By date");
    await expect(byDate).toHaveAttribute("aria-pressed", "true");
    await expect(byDate).toHaveClass(/app-nav__item--current/);
  });

  test("should count open and due tasks in the sidebar", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Today task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createTask({
      name: "Late task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-2) },
    });
    await createTask({
      name: "Later task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(3) },
    });
    await createTask({ name: "Done task", headerId: header._id, done: true });
    await page.reload();
    await waitForPageLoad(page);

    // open = today + late + later; due = today + late
    await expect(page.locator(".tasks-nav-btn .app-nav__count")).toHaveText(
      "3",
    );
    await expect(page.locator(".bydate-toggle-btn .app-nav__count")).toHaveText(
      "2",
    );
    await expect(page.locator(".page-header__description")).toContainText(
      "3 open · 2 due",
    );
  });
});

test.describe("UI - Theme", () => {
  test("should cycle system → light → dark and remember the choice", async ({
    page,
  }) => {
    const html = page.locator("html");
    const themeBtn = page.getByRole("button", { name: /^Colour theme/ });
    const bodyBg = () =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await expect(themeBtn).toHaveAttribute("aria-label", "Colour theme: System");
    await expect(html).not.toHaveAttribute("data-theme", /.+/);

    await themeBtn.click();
    await expect(themeBtn).toHaveAttribute("aria-label", "Colour theme: Light");
    await expect(html).toHaveAttribute("data-theme", "light");
    const lightBg = await bodyBg();

    await themeBtn.click();
    await expect(themeBtn).toHaveAttribute("aria-label", "Colour theme: Dark");
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await bodyBg()).not.toBe(lightBg);

    // Survives a reload (applied before first paint from localStorage)
    await page.reload();
    await waitForPageLoad(page);
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(themeBtn).toHaveAttribute("aria-label", "Colour theme: Dark");

    await themeBtn.click();
    await expect(themeBtn).toHaveAttribute("aria-label", "Colour theme: System");
    await expect(html).not.toHaveAttribute("data-theme", /.+/);
  });
});

test.describe("UI - Task rows", () => {
  test("should flag overdue and due-today dates in words, not just colour", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Late task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-2) },
    });
    await createTask({
      name: "Today task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createTask({
      name: "Later task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(3) },
    });
    await page.reload();
    await waitForPageLoad(page);

    const late = getTask(page, "Late task").locator(".task-card__ecd");
    await expect(late).toHaveClass(/task-card__ecd--overdue/);
    await expect(late).toContainText("Overdue");

    const today = getTask(page, "Today task").locator(".task-card__ecd");
    await expect(today).toHaveClass(/task-card__ecd--today/);
    await expect(today).toContainText("Today");

    const later = getTask(page, "Later task").locator(".task-card__ecd");
    await expect(later).not.toHaveClass(/--overdue|--today/);
    await expect(later.locator(".task-card__ecd-flag")).toHaveCount(0);
  });

  test("should drop the overdue flag once the task is done", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({
      name: "Late task",
      headerId: header._id,
      ecd: { type: "date", value: dateKey(-2) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await toggleTaskDone(page, "Late task");
    const ecd = getTask(page, "Late task").locator(".task-card__ecd");
    await expect(getTask(page, "Late task")).toHaveClass(/task-card--done/);
    await expect(ecd).not.toHaveClass(/task-card__ecd--overdue/);
    await expect(ecd).not.toContainText("Overdue");
  });

  test("should keep row actions quiet until the row is hovered", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Hover task", headerId: header._id });
    await page.reload();
    await waitForPageLoad(page);

    const actions = getTask(page, "Hover task").locator(".task-card__actions");
    await page.mouse.move(0, 0);
    await expect(actions).toHaveCSS("opacity", "0");

    await getTask(page, "Hover task").hover();
    await expect(actions).toHaveCSS("opacity", "1");
  });

  test("should keep the heading text exact, with the open count beside it", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Open task", headerId: header._id });
    await createTask({ name: "Done task", headerId: header._id, done: true });
    await page.reload();
    await waitForPageLoad(page);

    const section = page.locator(".readme-section", { hasText: "Work" });
    await expect(section.locator(".readme-heading__text")).toHaveText("Work");
    await expect(section.locator(".readme-heading__count")).toHaveText("1");
  });

  test("should open the add-task dialog from an empty header's row", async ({
    page,
  }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    await page.getByRole("button", { name: "No tasks yet — add one!" }).click();
    await expect(page.getByPlaceholder("Task name…")).toBeVisible();
    await expect(page.locator(".add-modal__title")).toContainText("Work");
  });
});

test.describe("UI - Dialogs", () => {
  test("should expose modals as named dialogs", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add Header" }),
    ).toBeVisible();
  });

  test("should close on Escape even when focus is outside the fields", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Some task", headerId: header._id });
    await page.reload();
    await waitForPageLoad(page);

    const section = page.locator(".readme-section", { hasText: "Work" });
    await section.getByTitle("Add task").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Click the title so focus leaves the name input, then Escape
    await page.locator(".add-modal__title").click();
    await expect(page.getByPlaceholder("Task name…")).not.toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("should return focus to the control that opened it", async ({
    page,
  }) => {
    const addHeader = page.getByRole("button", { name: "Add header" });
    await addHeader.click();
    await page.getByPlaceholder("Header name…").press("Escape");
    await expect(page.getByPlaceholder("Header name…")).not.toBeVisible();
    await expect(addHeader).toBeFocused();
  });

  test("should stay open when a drag starts inside and ends on the overlay", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add header" }).click();
    const input = page.getByPlaceholder("Header name…");
    const box = (await input.boundingBox())!;

    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(4, 4, { steps: 5 });
    await page.mouse.up();

    await expect(input).toBeVisible();
  });

  test("should start a reason-less delete confirmation on Cancel", async ({
    page,
  }) => {
    await createHeader("Work");
    await page.reload();
    await waitForPageLoad(page);

    await page
      .locator(".readme-section", { hasText: "Work" })
      .getByTitle("Delete header")
      .click();
    await expect(page.locator(".confirm-modal__btn--cancel")).toBeFocused();
  });
});

test.describe("UI - Action errors", () => {
  test("should show a dismissible error when an action fails", async ({
    page,
  }) => {
    const header = await createHeader("Work");
    await createTask({ name: "Flaky task", headerId: header._id });
    await page.reload();
    await waitForPageLoad(page);

    await page.route("**/tasks/*", (route) =>
      route.request().method() === "PUT"
        ? route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Server exploded" }),
          })
        : route.continue(),
    );

    await toggleTaskDone(page, "Flaky task");
    const alert = page.locator(".app-action-error");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveAttribute("role", "alert");
    await expect(alert).toContainText("Action failed: Server exploded");

    await page.getByRole("button", { name: "Dismiss error" }).click();
    await expect(alert).not.toBeVisible();
  });
});

test.describe("UI - By date", () => {
  test("should label the sections and tag each task with its header", async ({
    page,
  }) => {
    const work = await createHeader("Work");
    const home = await createHeader("Home");
    await createTask({
      name: "Today task",
      headerId: work._id,
      ecd: { type: "date", value: dateKey(0) },
    });
    await createTask({
      name: "Late task",
      headerId: work._id,
      ecd: { type: "date", value: dateKey(-1) },
    });
    await createTask({
      name: "Later task",
      headerId: home._id,
      ecd: { type: "date", value: dateKey(2) },
    });
    await page.reload();
    await waitForPageLoad(page);

    await page.locator(".bydate-toggle-btn").click();
    await expect(page.locator(".bydate-section-label")).toHaveText([
      "Today",
      "Overdue",
      "Upcoming",
    ]);
    await expect(
      getTask(page, "Today task").locator(".task-card__header-tag"),
    ).toHaveText("Work");
    await expect(
      getTask(page, "Later task").locator(".task-card__header-tag"),
    ).toHaveText("Home");
  });

  test("should not tag tasks with their header in the normal list", async ({
    page,
  }) => {
    const work = await createHeader("Work");
    await createTask({ name: "Plain task", headerId: work._id });
    await page.reload();
    await waitForPageLoad(page);

    await expect(
      getTask(page, "Plain task").locator(".task-card__header-tag"),
    ).toHaveCount(0);
  });
});

test.describe("UI - Phone layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("should turn the sidebar into a scrolling top bar without page overflow", async ({
    page,
  }) => {
    await expect(page.locator("h1", { hasText: "Task At Hand" })).toBeVisible();
    const nav = page.locator(".app-nav");
    await expect(nav).toHaveCSS("flex-direction", "row");
    await expect(page.locator(".app-nav__group-label").first()).toBeHidden();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // The last item is off-screen to the right but still reachable
    await page.locator(".oncall-toggle-btn").click();
    await expect(pageTitle(page)).toHaveText("On-call");
  });

  test("should open dialogs as a bottom sheet", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Full width, pinned to the bottom edge (polled: it slides in)
    await expect
      .poll(async () => {
        const box = (await dialog.boundingBox())!;
        return [Math.round(box.width), Math.round(box.y + box.height)];
      })
      .toEqual([390, 844]);
  });
});
