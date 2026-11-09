/**
 * E2E tests for the On-call view — shifts recorded separately from tasks.
 *
 * Primary is the default and renders solid red; secondary is a dashed
 * outline. The quick-add field takes "M/D start-end" with an optional
 * trailing "s" for secondary. Ended shifts are hidden on the local clock.
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

async function openOnCallView(page: Page) {
  await page.locator(".oncall-toggle-btn").click();
  await expect(page.locator(".oncall-panel")).toBeVisible();
  await expect(page.getByText("Loading on-call shifts…")).not.toBeVisible();
}

function rows(page: Page) {
  return page.locator(".oncall-panel__row");
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

  test("an overnight shift shows +1 and two bars on the timeline", async ({
    page,
  }) => {
    // Pick a day that isn't Sunday so both halves land in the same week.
    let offset = 1;
    while (new Date(Date.now() + offset * 864e5).getDay() === 0) offset++;
    await createOnCall({ date: dateKey(offset), start: "22:00", end: "06:00" });
    await openOnCallView(page);
    // Move forward to the week holding the shift if it isn't this one.
    for (let i = 0; i < 2; i++) {
      if ((await page.locator(".oncall-panel__bar").count()) > 0) break;
      await page.getByRole("button", { name: "Next week" }).click();
    }
    await expect(rows(page).first()).toContainText("+1");
    await expect(page.locator(".oncall-panel__bar--primary")).toHaveCount(2);
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
