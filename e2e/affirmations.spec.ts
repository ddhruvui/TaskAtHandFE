/**
 * E2E tests for the Affirmations view (short lines the user reads daily)
 */

import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  cleanAffirmations,
  createAffirmation,
  waitForPageLoad,
} from "./helpers";

async function openAffirmationsView(page: Page) {
  await page.locator(".affirmations-toggle-btn").click();
  await expect(page.locator(".affirmations-panel")).toBeVisible();
  await expect(page.getByText("Loading affirmations…")).not.toBeVisible();
}

function affirmationRow(page: Page, name: string) {
  return page.locator(".affirmations-panel__row", { hasText: name });
}

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await cleanAffirmations();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Affirmations - Panel", () => {
  test("should show empty state when no affirmations exist", async ({
    page,
  }) => {
    await openAffirmationsView(page);

    await expect(
      page.getByText("No affirmations yet — add one!"),
    ).toBeVisible();
  });

  test("should toggle affirmations button pressed state", async ({ page }) => {
    const btn = page.locator(".affirmations-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/affirmations-toggle-btn--active/);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".affirmations-panel")).not.toBeVisible();
  });

  test("should list affirmations in creation order", async ({ page }) => {
    await createAffirmation("Thank you blessing");
    await createAffirmation("I am enough");
    await openAffirmationsView(page);

    await expect(page.locator(".affirmations-panel__name")).toHaveText([
      "Thank you blessing",
      "I am enough",
    ]);
  });
});

test.describe("Affirmations - Create", () => {
  test("should create an affirmation via UI", async ({ page }) => {
    await openAffirmationsView(page);

    await page.getByRole("button", { name: "Add affirmation" }).click();
    await expect(page.locator(".affirmation-modal__title")).toHaveText(
      "Add Affirmation",
    );

    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    await expect(addBtn).toBeDisabled();

    await page
      .getByPlaceholder("Affirmation… (e.g. Thank you blessing)")
      .fill("Thank you blessing");
    await expect(addBtn).toBeEnabled();
    await addBtn.click();

    await expect(affirmationRow(page, "Thank you blessing")).toBeVisible();
    await expect(
      page.getByText("No affirmations yet — add one!"),
    ).not.toBeVisible();
  });

  test("should create an affirmation by pressing Enter", async ({ page }) => {
    await openAffirmationsView(page);
    await page.getByRole("button", { name: "Add affirmation" }).click();

    const input = page.getByPlaceholder(
      "Affirmation… (e.g. Thank you blessing)",
    );
    await input.fill("I am enough");
    await input.press("Enter");

    await expect(affirmationRow(page, "I am enough")).toBeVisible();
  });

  test("should cancel the add affirmation modal", async ({ page }) => {
    await openAffirmationsView(page);
    await page.getByRole("button", { name: "Add affirmation" }).click();
    await page
      .getByPlaceholder("Affirmation… (e.g. Thank you blessing)")
      .fill("Thank you blessing");

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByPlaceholder("Affirmation… (e.g. Thank you blessing)"),
    ).not.toBeVisible();
    await expect(
      page.getByText("No affirmations yet — add one!"),
    ).toBeVisible();
  });

  test("should close the add affirmation modal on Escape", async ({
    page,
  }) => {
    await openAffirmationsView(page);
    await page.getByRole("button", { name: "Add affirmation" }).click();

    await page
      .getByPlaceholder("Affirmation… (e.g. Thank you blessing)")
      .press("Escape");

    await expect(
      page.getByPlaceholder("Affirmation… (e.g. Thank you blessing)"),
    ).not.toBeVisible();
  });
});

test.describe("Affirmations - Update", () => {
  test("should edit an affirmation via UI", async ({ page }) => {
    await createAffirmation("Thank you blessing");
    await openAffirmationsView(page);

    await page
      .getByRole("button", { name: "Edit affirmation Thank you blessing" })
      .click();
    await expect(page.getByText("Edit Affirmation")).toBeVisible();

    const input = page.getByPlaceholder(
      "Affirmation… (e.g. Thank you blessing)",
    );
    await expect(input).toHaveValue("Thank you blessing");
    await input.fill("Thank you for this day");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      affirmationRow(page, "Thank you for this day"),
    ).toBeVisible();
    await expect(
      affirmationRow(page, "Thank you blessing"),
    ).not.toBeVisible();
  });
});

test.describe("Affirmations - Delete", () => {
  test("should delete an affirmation with confirmation", async ({ page }) => {
    await createAffirmation("Thank you blessing");
    await openAffirmationsView(page);

    await page
      .getByRole("button", { name: "Delete affirmation Thank you blessing" })
      .click();
    await expect(
      page.getByText('Delete affirmation "Thank you blessing"?'),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(
      page.getByText("No affirmations yet — add one!"),
    ).toBeVisible();
  });

  test("should keep the affirmation when deletion is cancelled", async ({
    page,
  }) => {
    await createAffirmation("Thank you blessing");
    await openAffirmationsView(page);

    await page
      .getByRole("button", { name: "Delete affirmation Thank you blessing" })
      .click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(affirmationRow(page, "Thank you blessing")).toBeVisible();
  });
});
