/**
 * E2E tests for the Calls view (people the user must call biweekly or monthly)
 */

import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  cleanCalls,
  createCall,
  createHeader,
  waitForPageLoad,
} from "./helpers";

async function openCallsView(page: Page) {
  await page.locator(".calls-toggle-btn").click();
  await expect(page.locator(".calls-panel")).toBeVisible();
  await expect(page.getByText("Loading calls…")).not.toBeVisible();
}

function callRow(page: Page, name: string) {
  return page.locator(".calls-panel__row", { hasText: name });
}

function biweeklySection(page: Page) {
  return page.locator(".calls-panel__section--biweekly");
}

function monthlySection(page: Page) {
  return page.locator(".calls-panel__section--monthly");
}

async function addCallViaUI(
  page: Page,
  name: string,
  frequency: "biweekly" | "monthly",
) {
  await page.getByRole("button", { name: "Add call" }).click();
  await page.getByPlaceholder("Person to call… (e.g. Grandma)").fill(name);
  await page
    .getByRole("radio", { name: frequency === "biweekly" ? "Biweekly" : "Monthly" })
    .check();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(callRow(page, name)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await cleanCalls();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Calls - Panel", () => {
  test("should show empty state when no calls exist", async ({ page }) => {
    await openCallsView(page);

    await expect(page.getByText("No calls yet — add one!")).toBeVisible();
  });

  test("should toggle calls button pressed state", async ({ page }) => {
    const btn = page.locator(".calls-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/calls-toggle-btn--active/);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".calls-panel")).not.toBeVisible();
  });
});

test.describe("Calls - Create", () => {
  test("should add a biweekly person into the Biweekly section", async ({
    page,
  }) => {
    await openCallsView(page);

    await page.getByRole("button", { name: "Add call" }).click();
    await expect(page.locator(".call-modal__title")).toHaveText("Add Call");

    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    await expect(addBtn).toBeDisabled();

    // Biweekly is the default frequency
    await expect(page.getByRole("radio", { name: "Biweekly" })).toBeChecked();

    await page.getByPlaceholder("Person to call… (e.g. Grandma)").fill(
      "Grandma",
    );
    await expect(addBtn).toBeEnabled();
    await addBtn.click();

    await expect(
      biweeklySection(page).locator(".calls-panel__row", {
        hasText: "Grandma",
      }),
    ).toBeVisible();
    await expect(
      monthlySection(page).locator(".calls-panel__row", {
        hasText: "Grandma",
      }),
    ).not.toBeVisible();
    await expect(page.getByText("No calls yet — add one!")).not.toBeVisible();
  });

  test("should add a monthly person into the Monthly section", async ({
    page,
  }) => {
    await openCallsView(page);

    await page.getByRole("button", { name: "Add call" }).click();
    await page
      .getByPlaceholder("Person to call… (e.g. Grandma)")
      .fill("Uncle Raj");
    await page.getByRole("radio", { name: "Monthly" }).check();
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(
      monthlySection(page).locator(".calls-panel__row", {
        hasText: "Uncle Raj",
      }),
    ).toBeVisible();
    await expect(
      biweeklySection(page).locator(".calls-panel__row", {
        hasText: "Uncle Raj",
      }),
    ).not.toBeVisible();
  });
});

test.describe("Calls - Mark called", () => {
  test("should mark a person as called", async ({ page }) => {
    await createCall("Grandma", "biweekly");
    await openCallsView(page);

    await page
      .getByRole("button", { name: "Mark Grandma as called" })
      .click();

    await expect(callRow(page, "Grandma")).toHaveClass(
      /calls-panel__row--done/,
    );
    await expect(
      callRow(page, "Grandma").locator(".calls-panel__name"),
    ).toHaveClass(/calls-panel__name--done/);
    await expect(
      callRow(page, "Grandma").locator(".calls-panel__checkbox"),
    ).toHaveClass(/calls-panel__checkbox--checked/);
  });

  test("should unmark a called person", async ({ page }) => {
    await createCall("Grandma", "biweekly");
    await openCallsView(page);

    await page.getByRole("button", { name: "Mark Grandma as called" }).click();
    await expect(callRow(page, "Grandma")).toHaveClass(
      /calls-panel__row--done/,
    );

    await page
      .getByRole("button", { name: "Mark Grandma as not called" })
      .click();

    await expect(callRow(page, "Grandma")).not.toHaveClass(
      /calls-panel__row--done/,
    );
    await expect(
      callRow(page, "Grandma").locator(".calls-panel__name"),
    ).not.toHaveClass(/calls-panel__name--done/);
  });
});

test.describe("Calls - Update", () => {
  test("should edit a person's name via UI", async ({ page }) => {
    await createCall("Grandma", "biweekly");
    await openCallsView(page);

    await page.getByRole("button", { name: "Edit call Grandma" }).click();
    await expect(page.getByText("Edit Call")).toBeVisible();

    const input = page.getByPlaceholder("Person to call… (e.g. Grandma)");
    await expect(input).toHaveValue("Grandma");
    await input.fill("Grandmother");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(callRow(page, "Grandmother")).toBeVisible();
    await expect(callRow(page, "Grandma")).not.toBeVisible();
  });

  test("should move a person to the other section when frequency changes", async ({
    page,
  }) => {
    await createCall("Grandma", "biweekly");
    await openCallsView(page);

    await expect(
      biweeklySection(page).locator(".calls-panel__row", {
        hasText: "Grandma",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Edit call Grandma" }).click();
    await expect(page.getByRole("radio", { name: "Biweekly" })).toBeChecked();
    await page.getByRole("radio", { name: "Monthly" }).check();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      monthlySection(page).locator(".calls-panel__row", {
        hasText: "Grandma",
      }),
    ).toBeVisible();
    await expect(
      biweeklySection(page).locator(".calls-panel__row", {
        hasText: "Grandma",
      }),
    ).not.toBeVisible();
  });
});

test.describe("Calls - Delete", () => {
  test("should delete a person with confirmation", async ({ page }) => {
    await createCall("Grandma", "biweekly");
    await openCallsView(page);

    await page.getByRole("button", { name: "Delete call Grandma" }).click();
    await expect(page.getByText('Delete call "Grandma"?')).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("No calls yet — add one!")).toBeVisible();
  });

  test("should keep the person when deletion is cancelled", async ({
    page,
  }) => {
    await createCall("Grandma", "biweekly");
    await openCallsView(page);

    await page.getByRole("button", { name: "Delete call Grandma" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(callRow(page, "Grandma")).toBeVisible();
  });
});

test.describe("Calls - Persistence", () => {
  test("should persist calls and called state across reload", async ({
    page,
  }) => {
    await openCallsView(page);
    await addCallViaUI(page, "Grandma", "biweekly");
    await addCallViaUI(page, "Uncle Raj", "monthly");
    await page.getByRole("button", { name: "Mark Grandma as called" }).click();
    await expect(callRow(page, "Grandma")).toHaveClass(
      /calls-panel__row--done/,
    );

    await page.reload();
    await waitForPageLoad(page);
    await openCallsView(page);

    await expect(
      biweeklySection(page).locator(".calls-panel__row", {
        hasText: "Grandma",
      }),
    ).toBeVisible();
    await expect(
      monthlySection(page).locator(".calls-panel__row", {
        hasText: "Uncle Raj",
      }),
    ).toBeVisible();
    await expect(callRow(page, "Grandma")).toHaveClass(
      /calls-panel__row--done/,
    );
    await expect(callRow(page, "Uncle Raj")).not.toHaveClass(
      /calls-panel__row--done/,
    );
  });
});

test.describe("Calls - Task view isolation", () => {
  test("should not show call people in the default task view", async ({
    page,
  }) => {
    await createHeader("Errands");
    await createCall("Grandma", "biweekly");
    await createCall("Uncle Raj", "monthly");

    await page.reload();
    await waitForPageLoad(page);

    // Default task view shows the header but never the call people
    await expect(
      page.locator(".readme-section", { hasText: "Errands" }),
    ).toBeVisible();
    await expect(page.getByText("Grandma")).not.toBeVisible();
    await expect(page.getByText("Uncle Raj")).not.toBeVisible();

    // They only appear on the dedicated Calls page
    await openCallsView(page);
    await expect(callRow(page, "Grandma")).toBeVisible();
    await expect(callRow(page, "Uncle Raj")).toBeVisible();
  });
});
