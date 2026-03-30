/**
 * E2E tests for Headers functionality
 */

import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createHeader,
  waitForPageLoad,
  addHeaderViaUI,
  deleteHeaderViaUI,
  getHeaderNames,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Headers - Create", () => {
  test("should show empty state when no headers exist", async ({ page }) => {
    await expect(page.getByText("No headers yet — add one!")).toBeVisible();
  });

  test("should create a new header via UI", async ({ page }) => {
    await addHeaderViaUI(page, "Work");

    await expect(page.locator("h2", { hasText: "Work" })).toBeVisible();
    await expect(page.getByText("No headers yet — add one!")).not.toBeVisible();
  });

  test("should create multiple headers in sequence", async ({ page }) => {
    await addHeaderViaUI(page, "Work");
    await addHeaderViaUI(page, "Personal");
    await addHeaderViaUI(page, "Shopping");

    const headers = await getHeaderNames(page);
    expect(headers).toEqual(["Work", "Personal", "Shopping"]);
  });

  test("should focus input and clear on open modal", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();

    const input = page.getByPlaceholder("Header name…");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");
  });

  test("should close modal on cancel", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByPlaceholder("Header name…")).not.toBeVisible();
  });

  test("should close modal on Escape key", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();
    await page.getByPlaceholder("Header name…").press("Escape");

    await expect(page.getByPlaceholder("Header name…")).not.toBeVisible();
  });

  test("should close modal on overlay click", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();
    await page
      .locator(".header-modal__overlay")
      .click({ position: { x: 0, y: 0 } });

    await expect(page.getByPlaceholder("Header name…")).not.toBeVisible();
  });

  test("should submit on Enter key", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();
    await page.getByPlaceholder("Header name…").fill("Work");
    await page.getByPlaceholder("Header name…").press("Enter");

    await expect(page.locator("h2", { hasText: "Work" })).toBeVisible();
  });

  test("should disable submit button when name is empty", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();

    const addButton = page.getByRole("button", { name: "Add", exact: true });
    await expect(addButton).toBeDisabled();

    await page.getByPlaceholder("Header name…").fill("Work");
    await expect(addButton).toBeEnabled();
  });

  test("should trim whitespace from header name", async ({ page }) => {
    await page.getByRole("button", { name: "Add header" }).click();
    await page.getByPlaceholder("Header name…").fill("  Work  ");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(page.locator("h2", { hasText: "Work" })).toBeVisible();
  });
});

test.describe("Headers - Read", () => {
  test("should display headers in priority order", async ({ page }) => {
    await createHeader("Work");
    await createHeader("Personal");
    await createHeader("Shopping");

    await page.reload();
    await waitForPageLoad(page);

    const headers = await getHeaderNames(page);
    expect(headers).toEqual(["Work", "Personal", "Shopping"]);
  });

  test("should show empty task state for header without tasks", async ({
    page,
  }) => {
    await addHeaderViaUI(page, "Work");

    const header = page.locator(".readme-section", { hasText: "Work" });
    await expect(header.getByText("No tasks yet — add one!")).toBeVisible();
  });
});

test.describe("Headers - Update", () => {
  test("should edit header name", async ({ page }) => {
    await addHeaderViaUI(page, "Work");

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Edit header").click();

    const input = page.getByPlaceholder("Header name…");
    await expect(input).toHaveValue("Work");
    await expect(input).toBeFocused();

    await input.fill("Office");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator("h2", { hasText: "Office" })).toBeVisible();
    await expect(page.locator("h2", { hasText: "Work" })).not.toBeVisible();
  });

  test("should select all text when editing header", async ({ page }) => {
    await addHeaderViaUI(page, "Work");

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Edit header").click();

    // Type immediately - should replace selected text
    await page.keyboard.type("Office");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator("h2", { hasText: "Office" })).toBeVisible();
  });

  test("should move header up in priority", async ({ page }) => {
    await addHeaderViaUI(page, "Work");
    await addHeaderViaUI(page, "Personal");
    await addHeaderViaUI(page, "Shopping");

    // Move "Personal" up
    const personalHeader = page.locator(".readme-section", {
      hasText: "Personal",
    });
    await personalHeader.getByTitle("Move header up").click();

    // Wait for the order to change by checking the first header
    await expect(page.locator(".readme-heading__text").first()).toHaveText(
      "Personal",
    );

    const headers = await getHeaderNames(page);
    expect(headers).toEqual(["Personal", "Work", "Shopping"]);
  });

  test("should move header down in priority", async ({ page }) => {
    await addHeaderViaUI(page, "Work");
    await addHeaderViaUI(page, "Personal");
    await addHeaderViaUI(page, "Shopping");

    // Move "Personal" down
    const personalHeader = page.locator(".readme-section", {
      hasText: "Personal",
    });
    await personalHeader.getByTitle("Move header down").click();

    // Wait for the order to change by checking the second header is Shopping
    await expect(page.locator(".readme-heading__text").nth(1)).toHaveText(
      "Shopping",
    );

    const headers = await getHeaderNames(page);
    expect(headers).toEqual(["Work", "Shopping", "Personal"]);
  });

  test("should disable up button for first header", async ({ page }) => {
    await addHeaderViaUI(page, "Work");
    await addHeaderViaUI(page, "Personal");

    const workHeader = page.locator(".readme-section", { hasText: "Work" });
    const upButton = workHeader.getByTitle("Move header up");

    await expect(upButton).toBeDisabled();
  });

  test("should disable down button for last header", async ({ page }) => {
    await addHeaderViaUI(page, "Work");
    await addHeaderViaUI(page, "Personal");

    const personalHeader = page.locator(".readme-section", {
      hasText: "Personal",
    });
    const downButton = personalHeader.getByTitle("Move header down");

    await expect(downButton).toBeDisabled();
  });
});

test.describe("Headers - Delete", () => {
  test("should delete header via UI", async ({ page }) => {
    await addHeaderViaUI(page, "Work");

    await deleteHeaderViaUI(page, "Work");

    await expect(page.locator("h2", { hasText: "Work" })).not.toBeVisible();
    await expect(page.getByText("No headers yet — add one!")).toBeVisible();
  });

  test("should show confirmation modal before deleting", async ({ page }) => {
    await addHeaderViaUI(page, "Work");

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Delete header").click();

    await expect(
      page.getByText('Delete header "Work" and all its tasks?'),
    ).toBeVisible();
  });

  test("should cancel delete on cancel button", async ({ page }) => {
    await addHeaderViaUI(page, "Work");

    const header = page.locator(".readme-section", { hasText: "Work" });
    await header.getByTitle("Delete header").click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.locator("h2", { hasText: "Work" })).toBeVisible();
  });

  test("should delete multiple headers", async ({ page }) => {
    await addHeaderViaUI(page, "Work");
    await addHeaderViaUI(page, "Personal");
    await addHeaderViaUI(page, "Shopping");

    await deleteHeaderViaUI(page, "Personal");

    const headers = await getHeaderNames(page);
    expect(headers).toEqual(["Work", "Shopping"]);
  });

  test("should maintain priority order after deletion", async ({ page }) => {
    await addHeaderViaUI(page, "First");
    await addHeaderViaUI(page, "Second");
    await addHeaderViaUI(page, "Third");
    await addHeaderViaUI(page, "Fourth");

    // Delete the second header
    await deleteHeaderViaUI(page, "Second");

    const headers = await getHeaderNames(page);
    expect(headers).toEqual(["First", "Third", "Fourth"]);
  });
});

test.describe("Headers - Error Handling", () => {
  test("should show error when backend is unavailable", async ({
    page,
    context,
  }) => {
    // Block API requests
    await context.route("**/headers", (route) => route.abort());

    await page.goto("/");

    await expect(page.getByText(/Failed to load/)).toBeVisible();
    await expect(page.getByText(/Is the backend running/)).toBeVisible();
  });
});
