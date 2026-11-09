/**
 * E2E tests for the On-call view — shifts recorded separately from tasks.
 *
 * Primary is the default and renders solid red; secondary is a dashed
 * outline. The quick-add field takes "M/D start-end" with an optional
 * trailing "s" for secondary. Ended shifts are hidden on the local clock.
 * The view is one agenda: shifts with "Not on call from … to …" gaps between
 * them (no week paging); its wording comes from `formatMoment`/`formatSpan`
 * in src/utils/oncall, imported here so the assertions follow the app.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  cleanOnCall,
  createOnCall,
  getOnCall,
  createHeader,
  createTask,
  getTasks,
  waitForPageLoad,
  dateKey,
} from "./helpers";
import { formatMoment, formatSpan } from "../src/utils/oncall";

async function openOnCallView(page: Page) {
  await page.locator(".oncall-toggle-btn").click();
  await expect(page.locator(".oncall-panel")).toBeVisible();
  await expect(page.getByText("Loading on-call shifts…")).not.toBeVisible();
}

function rows(page: Page) {
  return page.locator(".oncall-panel__row");
}

function gaps(page: Page) {
  return page.locator(".oncall-panel__gap");
}

/** Local Date for a date key + "HH:mm" (parsed by component, timezone safe). */
function at(key: string, time: string) {
  const [y, m, d] = key.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

/** "M/D" for a date key, as the quick-add shorthand takes it. */
function shorthand(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${m}/${d}`;
}

test.describe("On-call view", () => {
  test.beforeEach(async ({ page }) => {
    await cleanDatabase();
    await cleanOnCall();
    await page.goto("/");
    await waitForPageLoad(page);
  });

  test.afterAll(async () => {
    await cleanOnCall();
  });

  test("shows the empty message with no shifts", async ({ page }) => {
    await openOnCallView(page);
    await expect(
      page.getByText("No upcoming on-call shifts — add one!"),
    ).toBeVisible();
  });

  test("the toggle is exclusive with the other panels", async ({ page }) => {
    await openOnCallView(page);
    await page.locator(".vacation-toggle-btn").click();
    await expect(page.locator(".oncall-panel")).not.toBeVisible();
    await expect(page.locator(".vacation-panel")).toBeVisible();
  });

  test("quick add creates a primary shift by default", async ({ page }) => {
    const day = dateKey(3);
    await openOnCallView(page);
    await page.getByRole("button", { name: "Add on-call shift" }).click();
    await page
      .getByLabel("Quick add on-call shift")
      .fill(`${shorthand(day)} 9-22`);
    await expect(page.locator(".oncall-modal__preview")).toContainText(
      "09:00 → 22:00 · 13h · primary",
    );
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toHaveClass(/oncall-panel__row--primary/);
    await expect(rows(page).first()).toContainText("09:00 – 22:00");
    const stored = await getOnCall();
    expect(stored).toMatchObject([
      { date: day, start: "09:00", end: "22:00", type: "primary" },
    ]);
  });

  test("a trailing s makes the shift secondary", async ({ page }) => {
    const day = dateKey(4);
    await openOnCallView(page);
    await page.getByRole("button", { name: "Add on-call shift" }).click();
    await page
      .getByLabel("Quick add on-call shift")
      .fill(`${shorthand(day)} 10-18 s`);
    await expect(
      page.getByRole("radio", { name: "Secondary" }),
    ).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(rows(page).first()).toHaveClass(
      /oncall-panel__row--secondary/,
    );
    await expect(rows(page).first()).toContainText("secondary");
  });

  test("an overnight shift shows +1 and frees up the next morning", async ({
    page,
  }) => {
    await createOnCall({ date: dateKey(2), start: "22:00", end: "06:00" });
    await openOnCallView(page);
    await expect(rows(page).first()).toContainText("+1");
    await expect(page.locator(".oncall-panel__end")).toHaveText(
      `Nothing scheduled after ${formatMoment(at(dateKey(3), "06:00"), new Date())}`,
    );
  });

  test("shows the gap between shifts as 'Not on call from … to …'", async ({
    page,
  }) => {
    await createOnCall({ date: dateKey(2), start: "09:00", end: "22:00" });
    await createOnCall({ date: dateKey(10), start: "09:00", end: "17:00" });
    await openOnCallView(page);

    // the "now" gap, then the one between the two shifts
    await expect(gaps(page)).toHaveCount(2);
    const now = new Date();
    const between = gaps(page).nth(1);
    await expect(between).toContainText("Not on call");
    await expect(between).toContainText(
      `from ${formatMoment(at(dateKey(2), "22:00"), now)} to ${formatMoment(at(dateKey(10), "09:00"), now)}`,
    );
    // 22:00 → 09:00 eight days later
    await expect(between).toContainText(formatSpan(7 * 24 * 60 + 11 * 60));
    // agenda order: gap, shift, gap, shift
    await expect(
      page.locator(".oncall-panel__list > li:not(.oncall-panel__end)"),
    ).toHaveClass([
      /oncall-panel__gap--now/,
      /oncall-panel__row/,
      /oncall-panel__gap/,
      /oncall-panel__row/,
    ]);
  });

  test("opens with 'Not on call now' when no shift is running", async ({
    page,
  }) => {
    await createOnCall({ date: dateKey(3), start: "09:00", end: "17:00" });
    await openOnCallView(page);
    const first = page.locator(".oncall-panel__list > li").first();
    await expect(first).toHaveClass(/oncall-panel__gap--now/);
    await expect(first).toContainText("Not on call now");
    await expect(first).toContainText(
      `until ${formatMoment(at(dateKey(3), "09:00"), new Date())}`,
    );
  });

  test("back-to-back shifts leave no gap between them", async ({ page }) => {
    await createOnCall({ date: dateKey(2), start: "09:00", end: "17:00" });
    await createOnCall({
      date: dateKey(2),
      start: "17:00",
      end: "22:00",
      type: "secondary",
    });
    await openOnCallView(page);
    await expect(rows(page)).toHaveCount(2);
    // only the "now" gap — cover runs unbroken 09:00–22:00
    await expect(gaps(page)).toHaveCount(1);
    await expect(gaps(page).first()).toHaveClass(/oncall-panel__gap--now/);
  });

  test("a running shift opens the agenda without a 'now' gap", async ({
    page,
  }) => {
    await createOnCall({ date: dateKey(0), start: "00:00", end: "24:00" });
    await openOnCallView(page);
    const first = page.locator(".oncall-panel__list > li").first();
    await expect(first).toHaveClass(/oncall-panel__row--active/);
    await expect(first).toContainText("now");
    await expect(page.locator(".oncall-panel__gap--now")).toHaveCount(0);
  });

  test("has no week paging", async ({ page }) => {
    await createOnCall({ date: dateKey(2), start: "09:00", end: "22:00" });
    await openOnCallView(page);
    await expect(page.getByRole("button", { name: "Next week" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Previous week" }),
    ).toHaveCount(0);
  });

  test("shows an overlap error from the server", async ({ page }) => {
    const day = dateKey(5);
    await createOnCall({ date: day, start: "09:00", end: "22:00" });
    await openOnCallView(page);
    await page.getByRole("button", { name: "Add on-call shift" }).click();
    await page
      .getByLabel("Quick add on-call shift")
      .fill(`${shorthand(day)} 20-23`);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(/Action failed: Shift overlaps/)).toBeVisible();
  });

  test("edits a shift's type", async ({ page }) => {
    const day = dateKey(6);
    await createOnCall({ date: day, start: "09:00", end: "22:00" });
    await openOnCallView(page);
    await page
      .getByRole("button", { name: `Edit on-call shift ${day} 09:00` })
      .click();
    await page.getByRole("radio", { name: "Secondary" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(rows(page).first()).toHaveClass(
      /oncall-panel__row--secondary/,
    );
  });

  test("deletes a shift after confirming", async ({ page }) => {
    const day = dateKey(6);
    await createOnCall({ date: day, start: "09:00", end: "22:00" });
    await openOnCallView(page);
    await page
      .getByRole("button", { name: `Delete on-call shift ${day} 09:00` })
      .click();
    await page.locator(".confirm-modal button").last().click();
    await expect(rows(page)).toHaveCount(0);
    expect(await getOnCall()).toEqual([]);
  });

  test("a running shift shows the banner in every view", async ({ page }) => {
    await createOnCall({ date: dateKey(0), start: "00:00", end: "24:00" });
    await page.reload();
    await waitForPageLoad(page);
    const banner = page.locator(".app-oncall-banner");
    await expect(banner).toContainText("Primary on call now");
    await page.getByRole("button", { name: "Manage on-call" }).click();
    await expect(page.locator(".oncall-panel")).toBeVisible();
    await expect(banner).toBeVisible();
  });

  test("on-call never touches tasks", async ({ page }) => {
    const header = await createHeader("Work");
    await createTask({ headerId: header._id, name: "Ship it" });
    await createOnCall({ date: dateKey(2), start: "09:00", end: "22:00" });
    await openOnCallView(page);
    await page
      .getByRole("button", { name: `Delete on-call shift ${dateKey(2)} 09:00` })
      .click();
    await page.locator(".confirm-modal button").last().click();
    const tasks = await getTasks(header._id);
    expect(tasks.map((t: { name: string }) => t.name)).toEqual(["Ship it"]);
  });
});
