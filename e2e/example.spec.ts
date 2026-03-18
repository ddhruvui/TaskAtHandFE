import { test, expect } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");

  // Check if the page has Vite + React heading
  await expect(page.locator("h1")).toBeVisible();
});

test("page has expected title", async ({ page }) => {
  await page.goto("/");

  // Check the title
  await expect(page).toHaveTitle(/taskathandfe/);
});
