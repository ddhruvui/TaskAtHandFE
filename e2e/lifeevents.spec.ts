/**
 * E2E tests for the Life Events view (annual dates the cron adds to the todo)
 */

import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  cleanLifeEvents,
  createLifeEvent,
  getLifeEvents,
  runCron,
  waitForPageLoad,
  getHeaders,
  getTasks,
  toggleTaskDone,
  deleteTaskViaUI,
} from "./helpers";

/** Today's "D/M" in UTC — the calendar the backend cron matches against. */
function utcTodayDayMonth(): string {
  const now = new Date();
  return `${now.getUTCDate()}/${now.getUTCMonth() + 1}`;
}

async function openLifeEventsView(page: Page) {
  await page.locator(".lifeevents-toggle-btn").click();
  await expect(page.locator(".lifeevents-panel")).toBeVisible();
  await expect(page.getByText("Loading life events…")).not.toBeVisible();
}

function eventRow(page: Page, name: string) {
  return page
    .locator(".lifeevents-panel__row")
    .filter({ has: page.locator(".lifeevents-panel__name", { hasText: name }) });
}

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await cleanLifeEvents();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Life Events - Panel", () => {
  test("should show empty state when no life events exist", async ({
    page,
  }) => {
    await openLifeEventsView(page);

    await expect(page.getByText("No life events yet — add one!")).toBeVisible();
  });

  test("should toggle life events button pressed state", async ({ page }) => {
    const btn = page.locator(".lifeevents-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/lifeevents-toggle-btn--active/);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".lifeevents-panel")).not.toBeVisible();
  });
});

test.describe("Life Events - CRUD", () => {
  test("should create a life event via UI", async ({ page }) => {
    await openLifeEventsView(page);

    await page.getByRole("button", { name: "Add life event" }).click();
    await page
      .getByPlaceholder("Life event… (e.g. Wife's birthday)")
      .fill("Wife's birthday");
    await page.getByLabel("Month").selectOption("3");
    await page.getByLabel("Day").selectOption("7");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    const row = eventRow(page, "Wife's birthday");
    await expect(row).toBeVisible();
    await expect(row.locator(".lifeevents-panel__date")).toHaveText("↻ 7 Mar");

    const stored = await getLifeEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0].date).toBe("7/3");
    expect(stored[0].done).toBe(false);
    expect(stored[0].todoTaskId).toBeNull();
  });

  test("should disable Add until a name is entered", async ({ page }) => {
    await openLifeEventsView(page);

    await page.getByRole("button", { name: "Add life event" }).click();
    const confirm = page.getByRole("button", { name: "Add", exact: true });
    await expect(confirm).toBeDisabled();

    await page
      .getByPlaceholder("Life event… (e.g. Wife's birthday)")
      .fill("Anniversary");
    await expect(confirm).toBeEnabled();
  });

  test("should edit a life event's name and date via UI", async ({ page }) => {
    await createLifeEvent("Anniversery", "25/12");
    await page.reload();
    await waitForPageLoad(page);
    await openLifeEventsView(page);

    await eventRow(page, "Anniversery")
      .getByRole("button", { name: "Edit life event Anniversery" })
      .click();
    await page
      .getByPlaceholder("Life event… (e.g. Wife's birthday)")
      .fill("Anniversary");
    await page.getByLabel("Month").selectOption("11");
    await page.getByLabel("Day").selectOption("20");
    await page.getByRole("button", { name: "Save" }).click();

    const row = eventRow(page, "Anniversary");
    await expect(row).toBeVisible();
    await expect(row.locator(".lifeevents-panel__date")).toHaveText(
      "↻ 20 Nov",
    );
  });

  test("should clamp the day when switching to a shorter month", async ({
    page,
  }) => {
    await openLifeEventsView(page);

    await page.getByRole("button", { name: "Add life event" }).click();
    await page
      .getByPlaceholder("Life event… (e.g. Wife's birthday)")
      .fill("Month-end ritual");
    await page.getByLabel("Month").selectOption("1");
    await page.getByLabel("Day").selectOption("31");
    await page.getByLabel("Month").selectOption("2");
    await expect(page.getByLabel("Day")).toHaveValue("29");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(
      eventRow(page, "Month-end ritual").locator(".lifeevents-panel__date"),
    ).toHaveText("↻ 29 Feb");
  });

  test("should delete a life event via UI", async ({ page }) => {
    await createLifeEvent("Wife's birthday", "7/3");
    await page.reload();
    await waitForPageLoad(page);
    await openLifeEventsView(page);

    await eventRow(page, "Wife's birthday")
      .getByRole("button", { name: "Delete life event Wife's birthday" })
      .click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("No life events yet — add one!")).toBeVisible();
    expect(await getLifeEvents()).toHaveLength(0);
  });

  test("should reorder life events with the move buttons", async ({ page }) => {
    await createLifeEvent("First", "1/1");
    await createLifeEvent("Second", "2/2");
    await page.reload();
    await waitForPageLoad(page);
    await openLifeEventsView(page);

    await eventRow(page, "Second")
      .getByRole("button", { name: "Move life event Second up" })
      .click();

    const names = page.locator(".lifeevents-panel__name");
    await expect(names.first()).toHaveText("Second");
    await expect(names.nth(1)).toHaveText("First");

    // Priorities persisted contiguously
    const stored = await getLifeEvents();
    expect(stored.map((e: { name: string }) => e.name)).toEqual([
      "Second",
      "First",
    ]);
  });

  test("should toggle done from the panel (no linked task)", async ({
    page,
  }) => {
    await createLifeEvent("Wife's birthday", "7/3");
    await page.reload();
    await waitForPageLoad(page);
    await openLifeEventsView(page);

    const row = eventRow(page, "Wife's birthday");
    await row
      .getByRole("button", { name: "Mark Wife's birthday as done" })
      .click();
    await expect(row.locator(".lifeevents-panel__name")).toHaveClass(
      /lifeevents-panel__name--done/,
    );

    await row
      .getByRole("button", { name: "Mark Wife's birthday as not done" })
      .click();
    await expect(row.locator(".lifeevents-panel__name")).not.toHaveClass(
      /lifeevents-panel__name--done/,
    );
  });
});

test.describe("Life Events - Cron & todo sync", () => {
  test("cron adds a due life event to the todo under an Events header and completes the loop", async ({
    page,
  }) => {
    // Due today (UTC) → the cron run picks it up
    await createLifeEvent("Wife's birthday", utcTodayDayMonth());
    let stats = await runCron();
    expect(stats.lifeEventTasksCreated).toBe(1);

    // Todo side: an "Events" header with the linked task
    const headers = await getHeaders();
    const eventsHeader = headers.find(
      (h: { name: string }) => h.name === "Events",
    );
    expect(eventsHeader).toBeDefined();
    const todoTasks = await getTasks(eventsHeader._id);
    expect(todoTasks.map((t: { name: string }) => t.name)).toContain(
      "Wife's birthday",
    );

    // Panel shows the linked state
    await page.reload();
    await waitForPageLoad(page);
    await openLifeEventsView(page);
    const row = eventRow(page, "Wife's birthday");
    await expect(row.locator(".lifeevents-panel__intodo")).toBeVisible();

    // Completing the todo task marks the life event done (client sync)
    await page.locator(".lifeevents-toggle-btn").click(); // back to todo view
    await toggleTaskDone(page, "Wife's birthday");
    // The life-event sync runs after the todo refresh — wait for it to land
    await expect
      .poll(async () => (await getLifeEvents())[0]?.done, { timeout: 10_000 })
      .toBe(true);
    await openLifeEventsView(page);
    await expect(
      eventRow(page, "Wife's birthday").locator(".lifeevents-panel__name"),
    ).toHaveClass(/lifeevents-panel__name--done/);

    // The next cron run deletes the done task but keeps the life event
    stats = await runCron();
    expect(stats.lifeEventsCompleted).toBe(1);
    expect(stats.lifeEventTasksCreated).toBe(0); // same-day rerun cannot re-add

    const events = await getLifeEvents();
    expect(events).toHaveLength(1); // never deleted from Life Events
    expect(events[0].done).toBe(true);
    expect(events[0].todoTaskId).toBeNull();

    const headersAfter = await getHeaders();
    expect(
      headersAfter.find((h: { name: string }) => h.name === "Events"),
    ).toBeUndefined(); // emptied header cleaned up by the cron
  });

  test("cron ignores life events not due today", async ({ page }) => {
    // Use a date that is never "today": the D/M one week from now differs
    // from today's in day (and possibly month)
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 7);
    await createLifeEvent(
      "Future event",
      `${future.getUTCDate()}/${future.getUTCMonth() + 1}`,
    );

    const stats = await runCron();
    expect(stats.lifeEventTasksCreated).toBe(0);

    const headers = await getHeaders();
    expect(
      headers.find((h: { name: string }) => h.name === "Events"),
    ).toBeUndefined();

    await page.reload();
    await waitForPageLoad(page);
    await openLifeEventsView(page);
    await expect(
      eventRow(page, "Future event").locator(".lifeevents-panel__intodo"),
    ).not.toBeVisible();
  });

  test("deleting the linked todo task unlinks the life event but keeps it", async ({
    page,
  }) => {
    await createLifeEvent("Wife's birthday", utcTodayDayMonth());
    await runCron();

    await page.reload();
    await waitForPageLoad(page);

    // Delete the task from the todo (undone → the helper fills the reason)
    await deleteTaskViaUI(page, "Wife's birthday", "not this year");

    await openLifeEventsView(page);
    const row = eventRow(page, "Wife's birthday");
    await expect(row).toBeVisible(); // still a life event
    await expect(row.locator(".lifeevents-panel__intodo")).not.toBeVisible();

    const events = await getLifeEvents();
    expect(events[0].todoTaskId).toBeNull();
    expect(events[0].done).toBe(false); // deleting ≠ completing
  });
});
