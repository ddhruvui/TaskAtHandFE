/**
 * E2E tests for the Vacation view — booked time off, where a missed day is not
 * procrastination.
 *
 * Both dates are inclusive, ranges may not overlap, and the panel's re-date
 * flow sends `vacationMove: true` so a trip booked in advance is never read as
 * a postpone.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  cleanVacations,
  createVacation,
  getVacations,
  createHeader,
  createTask,
  getRescheduleEvents,
  getTasks,
  waitForPageLoad,
  dateKey,
} from "./helpers";

async function openVacationView(page: Page) {
  await page.locator(".vacation-toggle-btn").click();
  await expect(page.locator(".vacation-panel")).toBeVisible();
  await expect(page.getByText("Loading vacations…")).not.toBeVisible();
}

/** Rows in panel order. */
function rows(page: Page) {
  return page.locator(".vacation-panel__row");
}

test.describe("Vacation view", () => {
  test.beforeEach(async ({ page }) => {
    await cleanDatabase();
    await cleanVacations();
    await page.goto("/");
    await waitForPageLoad(page);
  });

  test.afterAll(async () => {
    await cleanVacations();
  });

  test.describe("Empty state and navigation", () => {
    test("shows the empty message with no vacations booked", async ({
      page,
    }) => {
      await openVacationView(page);
      await expect(page.getByText("No vacations yet — add one!")).toBeVisible();
    });

    test("the toggle is exclusive with the other panels", async ({ page }) => {
      await openVacationView(page);
      await page.locator(".insights-toggle-btn").click();
      await expect(page.locator(".vacation-panel")).not.toBeVisible();
    });

    test("toggling off returns to the todo list", async ({ page }) => {
      await openVacationView(page);
      await page.locator(".vacation-toggle-btn").click();
      await expect(page.locator(".vacation-panel")).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add header" }),
      ).toBeVisible();
    });
  });

  test.describe("Booking a vacation", () => {
    test("books a vacation and lists it with its length", async ({ page }) => {
      await createVacation(dateKey(10), dateKey(14), "Kerala trip");
      await openVacationView(page);

      await expect(rows(page)).toHaveCount(1);
      // Both ends count, so 10th → 14th is five days, not four.
      await expect(rows(page).first()).toContainText("5 days");
      await expect(rows(page).first()).toContainText("Kerala trip");
      await expect(rows(page).first()).toContainText("upcoming");
    });

    test("a one-day vacation reads as 1 day", async ({ page }) => {
      await createVacation(dateKey(5), dateKey(5));
      await openVacationView(page);
      await expect(rows(page).first()).toContainText("1 day");
    });

    test("creates a vacation through the modal", async ({ page }) => {
      await openVacationView(page);
      await page.getByRole("button", { name: "Add vacation" }).click();

      await expect(page.locator(".vacation-modal")).toBeVisible();
      await page.locator(".vacation-modal__note-input").fill("Goa");
      await page.getByRole("button", { name: "Book" }).click();

      await expect(page.locator(".vacation-modal")).not.toBeVisible();
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first()).toContainText("Goa");

      const stored = await getVacations();
      expect(stored).toHaveLength(1);
      expect(stored[0].note).toBe("Goa");
      // Defaults to a single day: today to today, both inclusive.
      expect(stored[0].startDate).toBe(stored[0].endDate);
    });

    test("surfaces the backend's overlap rejection", async ({ page }) => {
      // The modal defaults to today → today, so a range already covering today
      // always collides — no dependence on which day the suite runs.
      await createVacation(dateKey(-1), dateKey(1));
      await openVacationView(page);
      await page.getByRole("button", { name: "Add vacation" }).click();
      await page.getByRole("button", { name: "Book" }).click();

      await expect(page.getByText(/overlaps an existing one/)).toBeVisible();
      expect(await getVacations()).toHaveLength(1);
    });

    test("orders vacations oldest start date first", async ({ page }) => {
      await createVacation(dateKey(20), dateKey(22), "Later");
      await createVacation(dateKey(3), dateKey(5), "Sooner");
      await openVacationView(page);

      await expect(rows(page)).toHaveCount(2);
      await expect(rows(page).nth(0)).toContainText("Sooner");
      await expect(rows(page).nth(1)).toContainText("Later");
    });
  });

  test.describe("Editing and deleting", () => {
    test("shortens a vacation when the user comes home early", async ({
      page,
    }) => {
      await createVacation(dateKey(3), dateKey(9), "Trip");
      await openVacationView(page);

      await page.locator(".vacation-panel__icon-btn").first().click();
      await expect(page.locator(".vacation-modal")).toBeVisible();
      await expect(page.locator(".vacation-modal__title")).toHaveText(
        "Edit Vacation",
      );
      await page.locator(".vacation-modal__note-input").fill("Home early");
      await page.getByRole("button", { name: "Save" }).click();

      await expect(rows(page).first()).toContainText("Home early");
    });

    test("deletes a vacation after confirmation", async ({ page }) => {
      await createVacation(dateKey(3), dateKey(9));
      await openVacationView(page);

      await page.locator(".vacation-panel__icon-btn--danger").first().click();
      await expect(
        page.getByText(/count as ordinary days again/),
      ).toBeVisible();
      await page.locator(".confirm-modal__btn--confirm").click();

      await expect(rows(page)).toHaveCount(0);
      expect(await getVacations()).toHaveLength(0);
    });

    test("cancelling the delete keeps the vacation", async ({ page }) => {
      await createVacation(dateKey(3), dateKey(9));
      await openVacationView(page);

      await page.locator(".vacation-panel__icon-btn--danger").first().click();
      await page.locator(".confirm-modal__btn--cancel").click();

      await expect(rows(page)).toHaveCount(1);
    });
  });

  test.describe("The re-date list", () => {
    test("lists a one-time dated task that falls inside the vacation", async ({
      page,
    }) => {
      const header = await createHeader("Work");
      await createTask({
        name: "Ship report",
        headerId: header._id,
        ecd: { type: "date", value: dateKey(5) },
      });
      await createVacation(dateKey(3), dateKey(9));
      await openVacationView(page);

      await page.getByRole("button", { name: /^Tasks during/ }).click();
      await expect(page.locator(".vacation-panel__task-row")).toHaveCount(1);
      await expect(page.locator(".vacation-panel__task-name")).toHaveText(
        "Ship report",
      );
      await expect(page.locator(".vacation-panel__task-meta")).toContainText(
        "Work",
      );
    });

    test("does not list recurring tasks — they are exempted, not moved", async ({
      page,
    }) => {
      const header = await createHeader("Health");
      await createTask({
        name: "Meditate",
        headerId: header._id,
        ecd: { type: "day_of_week", value: ["Mon", "Wed"] },
      });
      await createVacation(dateKey(3), dateKey(9));
      await openVacationView(page);

      await page.getByRole("button", { name: /^Tasks during/ }).click();
      await expect(
        page.getByText(/Repeating tasks aren't listed/),
      ).toBeVisible();
      await expect(page.locator(".vacation-panel__task-row")).toHaveCount(0);
    });

    test("does not list tasks outside the window", async ({ page }) => {
      const header = await createHeader("Work");
      await createTask({
        name: "Outside",
        headerId: header._id,
        ecd: { type: "date", value: dateKey(20) },
      });
      await createVacation(dateKey(3), dateKey(9));
      await openVacationView(page);

      await page.getByRole("button", { name: /^Tasks during/ }).click();
      await expect(page.locator(".vacation-panel__task-row")).toHaveCount(0);
    });

    test("re-dates a task and flags the move as a vacationMove", async ({
      page,
    }) => {
      const header = await createHeader("Work");
      await createTask({
        name: "Ship report",
        headerId: header._id,
        ecd: { type: "date", value: dateKey(5) },
      });
      await createVacation(dateKey(3), dateKey(9));
      await openVacationView(page);

      await page.getByRole("button", { name: /^Tasks during/ }).click();
      await page
        .getByRole("button", { name: "Pick a new date for Ship report" })
        .click();

      await expect(page.locator(".vacation-modal")).toBeVisible();
      await expect(
        page.getByText(/won't be counted as procrastination/),
      ).toBeVisible();
      await page.getByRole("button", { name: "Move task" }).click();

      // The task leaves the list because it no longer falls inside the window.
      await expect(page.locator(".vacation-panel__task-row")).toHaveCount(0);

      // It defaults to the first day back, and the archive records WHY it moved.
      const tasks = await getTasks(header._id);
      expect(tasks[0].ecd.value).toBe(dateKey(10));

      const events = await getRescheduleEvents();
      const move = events.find(
        (e: { taskName: string }) => e.taskName === "Ship report",
      );
      expect(move.pushedLater).toBe(true);
      expect(move.vacationMove).toBe(true);
    });

    test("collapses the task list when toggled again", async ({ page }) => {
      await createVacation(dateKey(3), dateKey(9));
      await openVacationView(page);

      await page.getByRole("button", { name: /^Tasks during/ }).click();
      await expect(page.locator(".vacation-panel__tasks")).toBeVisible();
      await page.getByRole("button", { name: /^Tasks during/ }).click();
      await expect(page.locator(".vacation-panel__tasks")).not.toBeVisible();
    });
  });

  test.describe("The active-vacation banner", () => {
    test("shows in every view while a vacation is running", async ({
      page,
    }) => {
      // Covers today at both ends: a forgotten vacation is the failure mode
      // this banner exists to prevent.
      await createVacation(dateKey(-2), dateKey(2), "Now");
      await page.reload();
      await waitForPageLoad(page);

      await expect(page.locator(".app-vacation-banner")).toBeVisible();
      // The total is timezone-independent (both ends come from the same local
      // `dateKey`), but the day *index* is not: the backend counts in UTC, so
      // near midnight it can be a day ahead of the local clock these fixtures
      // were built from. Assert the shape, not a fixed index.
      await expect(page.locator(".app-vacation-banner")).toContainText(
        /day \d+ of 5/,
      );

      // Still visible from a panel, not just the todo list.
      await page.locator(".insights-toggle-btn").click();
      await expect(page.locator(".app-vacation-banner")).toBeVisible();
    });

    test("is absent when no vacation is running", async ({ page }) => {
      await createVacation(dateKey(10), dateKey(14));
      await page.reload();
      await waitForPageLoad(page);
      await expect(page.locator(".app-vacation-banner")).not.toBeVisible();
    });

    test("its Manage button opens the Vacation view", async ({ page }) => {
      await createVacation(dateKey(-1), dateKey(1));
      await page.reload();
      await waitForPageLoad(page);

      await page.getByRole("button", { name: "Manage vacation" }).click();
      await expect(page.locator(".vacation-panel")).toBeVisible();
    });

    test("marks the running vacation in the list", async ({ page }) => {
      await createVacation(dateKey(-1), dateKey(1));
      await openVacationView(page);

      await expect(rows(page).first()).toHaveClass(
        /vacation-panel__row--active/,
      );
      await expect(rows(page).first()).toContainText("on now");
      await expect(
        page.locator(".vacation-panel__banner--active"),
      ).toBeVisible();
    });
  });
});
