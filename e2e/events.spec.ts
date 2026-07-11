/**
 * E2E tests for the Events view (reusable task bundles)
 */

import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  cleanEvents,
  createEvent,
  waitForPageLoad,
  getHeaders,
  getTaskNamesInHeader,
  dateKey,
} from "./helpers";
import { formatDateKey } from "../src/utils/ecd";

async function openEventsView(page: Page) {
  await page.locator(".events-toggle-btn").click();
  await expect(page.locator(".events-panel")).toBeVisible();
  await expect(page.getByText("Loading events…")).not.toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await cleanEvents();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Events - Panel", () => {
  test("should show empty state when no events exist", async ({ page }) => {
    await openEventsView(page);

    await expect(page.getByText("No events yet — add one!")).toBeVisible();
  });

  test("should toggle events button pressed state", async ({ page }) => {
    const btn = page.locator(".events-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/events-toggle-btn--active/);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".events-panel")).not.toBeVisible();
  });
});

test.describe("Events - Create", () => {
  test("should create an event via UI", async ({ page }) => {
    await openEventsView(page);

    await page.getByRole("button", { name: "Add event" }).click();
    await page
      .getByPlaceholder("Event name… (e.g. Burger Night)")
      .fill("Burger Night");
    await page
      .locator(".event-modal__textarea")
      .fill("Procure onion\nProcure bun\nProcure patty");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    const section = page.locator(".readme-section", {
      hasText: "Burger Night",
    });
    await expect(section).toBeVisible();
    await expect(section.locator(".events-panel__task-name")).toHaveText([
      "Procure onion",
      "Procure bun",
      "Procure patty",
    ]);
    await expect(page.getByText("No events yet — add one!")).not.toBeVisible();
  });

  test("should update the task count hint while typing", async ({ page }) => {
    await openEventsView(page);
    await page.getByRole("button", { name: "Add event" }).click();

    await expect(page.getByText("One task per line — 0 tasks")).toBeVisible();

    await page.locator(".event-modal__textarea").fill("Task A");
    await expect(page.getByText("One task per line — 1 task")).toBeVisible();

    // Blank lines are ignored
    await page.locator(".event-modal__textarea").fill("Task A\n\n  \nTask B");
    await expect(page.getByText("One task per line — 2 tasks")).toBeVisible();
  });

  test("should disable Add button until name and tasks are filled", async ({
    page,
  }) => {
    await openEventsView(page);
    await page.getByRole("button", { name: "Add event" }).click();

    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    await expect(addBtn).toBeDisabled();

    await page
      .getByPlaceholder("Event name… (e.g. Burger Night)")
      .fill("Burger Night");
    await expect(addBtn).toBeDisabled();

    await page.locator(".event-modal__textarea").fill("Procure onion");
    await expect(addBtn).toBeEnabled();
  });

  test("should cancel the add event modal", async ({ page }) => {
    await openEventsView(page);
    await page.getByRole("button", { name: "Add event" }).click();
    await page
      .getByPlaceholder("Event name… (e.g. Burger Night)")
      .fill("Burger Night");

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByPlaceholder("Event name… (e.g. Burger Night)"),
    ).not.toBeVisible();
    await expect(page.getByText("No events yet — add one!")).toBeVisible();
  });

  test("should close the add event modal on Escape", async ({ page }) => {
    await openEventsView(page);
    await page.getByRole("button", { name: "Add event" }).click();

    await page
      .getByPlaceholder("Event name… (e.g. Burger Night)")
      .press("Escape");

    await expect(
      page.getByPlaceholder("Event name… (e.g. Burger Night)"),
    ).not.toBeVisible();
  });
});

test.describe("Events - Update", () => {
  test("should edit an event via UI", async ({ page }) => {
    await createEvent("Burger Night", ["Procure onion"]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: "Edit event Burger Night" })
      .click();
    await expect(page.getByText("Edit Event")).toBeVisible();

    const nameInput = page.getByPlaceholder("Event name… (e.g. Burger Night)");
    await expect(nameInput).toHaveValue("Burger Night");
    await nameInput.fill("Pizza Night");
    await page
      .locator(".event-modal__textarea")
      .fill("Procure dough\nProcure cheese");
    await page.getByRole("button", { name: "Save" }).click();

    const section = page.locator(".readme-section", { hasText: "Pizza Night" });
    await expect(section).toBeVisible();
    await expect(section.locator(".events-panel__task-name")).toHaveText([
      "Procure dough",
      "Procure cheese",
    ]);
    await expect(
      page.locator(".readme-section", { hasText: "Burger Night" }),
    ).not.toBeVisible();
  });
});

test.describe("Events - Delete", () => {
  test("should delete an event with confirmation", async ({ page }) => {
    await createEvent("Burger Night", ["Procure onion"]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: "Delete event Burger Night" })
      .click();
    await expect(
      page.getByText(
        'Delete event "Burger Night"? Tasks already added to the todo stay.',
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("No events yet — add one!")).toBeVisible();
  });

  test("should keep the event when deletion is cancelled", async ({
    page,
  }) => {
    await createEvent("Burger Night", ["Procure onion"]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: "Delete event Burger Night" })
      .click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.locator(".readme-section", { hasText: "Burger Night" }),
    ).toBeVisible();
  });
});

test.describe("Events - Add to todo", () => {
  test("should open the schedule modal with all tasks preselected", async ({
    page,
  }) => {
    await createEvent("Burger Night", [
      "Procure onion",
      "Procure bun",
      "Procure patty",
    ]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: "Add Burger Night to todo" })
      .click();

    await expect(page.getByText("Add to todo — Burger Night")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add 3 tasks" }),
    ).toBeVisible();
    await expect(
      page.locator(".schedule-modal__checkbox--checked"),
    ).toHaveCount(3);
  });

  test("should add all event tasks under a header named after the event", async ({
    page,
  }) => {
    await createEvent("Burger Night", ["Procure onion", "Procure bun"]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: "Add Burger Night to todo" })
      .click();
    await page.getByRole("button", { name: "Add 2 tasks" }).click();

    await expect(
      page.getByText(
        `Added 2 tasks under "Burger Night" for ${formatDateKey(dateKey(0))}.`,
      ),
    ).toBeVisible();

    // Event template is not consumed
    await expect(
      page.locator(".readme-section", { hasText: "Burger Night" }),
    ).toBeVisible();

    // Switch back to the todo view and verify the tasks landed
    await page.locator(".events-toggle-btn").click();
    const names = await getTaskNamesInHeader(page, "Burger Night");
    expect(names).toEqual(["Procure onion", "Procure bun"]);
  });

  test("should only add the selected tasks", async ({ page }) => {
    await createEvent("Burger Night", ["Procure onion", "Procure bun"]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: "Add Burger Night to todo" })
      .click();
    await page.getByRole("button", { name: "Unmark Procure onion" }).click();
    await page.getByRole("button", { name: "Add 1 task", exact: true }).click();
    // The modal closes only once the tasks have been created
    await expect(page.getByText("Add to todo — Burger Night")).not.toBeVisible();

    await page.locator(".events-toggle-btn").click();
    const section = page.locator(".readme-section", { hasText: "Burger Night" });
    await expect(section.locator(".task-card")).toHaveCount(1);
    const names = await getTaskNamesInHeader(page, "Burger Night");
    expect(names).toEqual(["Procure bun"]);
  });

  test("should toggle all tasks with the select all button", async ({
    page,
  }) => {
    await createEvent("Burger Night", ["Procure onion", "Procure bun"]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: "Add Burger Night to todo" })
      .click();

    await page.getByRole("button", { name: "Unselect all" }).click();
    await expect(
      page.getByRole("button", { name: "Add 0 tasks" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Select all" }).click();
    await expect(
      page.getByRole("button", { name: "Add 2 tasks" }),
    ).toBeEnabled();
  });

  test("should quick add a single task from its row", async ({ page }) => {
    await createEvent("Burger Night", ["Procure onion", "Procure bun"]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: 'Add "Procure onion" to todo' })
      .click();

    await expect(
      page.getByRole("button", { name: "Add 1 task", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add 1 task", exact: true }).click();
    // The modal closes only once the tasks have been created
    await expect(page.getByText("Add to todo — Burger Night")).not.toBeVisible();

    await page.locator(".events-toggle-btn").click();
    const section = page.locator(".readme-section", { hasText: "Burger Night" });
    await expect(section.locator(".task-card")).toHaveCount(1);
    const names = await getTaskNamesInHeader(page, "Burger Night");
    expect(names).toEqual(["Procure onion"]);
  });

  test("should reuse the existing header when scheduling twice", async ({
    page,
  }) => {
    await createEvent("Burger Night", ["Procure onion"]);
    await openEventsView(page);

    await page
      .getByRole("button", { name: "Add Burger Night to todo" })
      .click();
    await page.getByRole("button", { name: "Add 1 task", exact: true }).click();
    await expect(page.getByText('under "Burger Night"')).toBeVisible();

    await page
      .getByRole("button", { name: "Add Burger Night to todo" })
      .click();
    await page.getByRole("button", { name: "Add 1 task", exact: true }).click();
    // The modal closes only once the tasks have been created
    await expect(page.getByText("Add to todo — Burger Night")).not.toBeVisible();

    const headers = await getHeaders();
    const eventHeaders = headers.filter(
      (h: { name: string }) => h.name === "Burger Night",
    );
    expect(eventHeaders).toHaveLength(1);

    await page.locator(".events-toggle-btn").click();
    const section = page.locator(".readme-section", { hasText: "Burger Night" });
    await expect(section.locator(".task-card")).toHaveCount(2);
    const names = await getTaskNamesInHeader(page, "Burger Night");
    expect(names).toEqual(["Procure onion", "Procure onion"]);
  });
});
