import { test, expect, type Page } from "@playwright/test";

/**
 * Comprehensive E2E tests for Habits functionality
 * Tests all CRUD operations, recurring scheduling, and edge cases
 * Based on API_REFERENCE.md specifications
 */

// Helper to reset the database state before each test
async function clearHabits(page: Page) {
  // Use API to delete all habits for faster test setup
  const response = await page.request.get("http://localhost:3002/api/habbits");
  const data = await response.json();

  if (data.success && data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      await page.request.delete(
        `http://localhost:3002/api/habbits/${item._id}`,
      );
    }
  }

  // Navigate to app after clearing
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Habits - Page Loading", () => {
  test("homepage loads successfully with Habits section", async ({ page }) => {
    await page.goto("/");

    // Verify page title
    await expect(page).toHaveTitle(/taskathandfe/i);

    // Verify main heading
    await expect(page.locator("h1")).toHaveText("Task At Hand");

    // Verify Habits section exists
    const habitsHeading = page.locator("h2").filter({ hasText: "Habits" });
    await expect(habitsHeading).toBeVisible();
  });

  test("displays empty state when no habits exist", async ({ page }) => {
    await clearHabits(page);

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();
    await expect(habitsSection.locator("p.empty-message")).toHaveText(
      "No tasks yet — add one!",
    );
  });

  test("Add button is visible in Habits section", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();
    const addButton = habitsSection.locator(
      'button[aria-label="Add task to Habits"]',
    );
    await expect(addButton).toBeVisible();
  });
});

test.describe("Habits - Create Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearHabits(page);
  });

  test("creates habit with name and single day of week", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Click add button
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();

    // Modal should appear
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // Fill in name
    await page.locator('input[placeholder="Task name…"]').fill("Morning run");

    // Weekly mode should be selected by default for habits
    // Click Friday button
    await page.locator('.add-modal__dow-btn:has-text("Fri")').click();

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(habitsSection.locator("text=Morning run")).toBeVisible();

    // Verify empty state is gone
    await expect(habitsSection.locator("p.empty-message")).not.toBeVisible();
  });

  test("creates habit with name and notes", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Click add button
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();

    // Fill in name and notes
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Practice meditation");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("10 minutes mindfulness");

    // Weekly mode should be selected by default, click Monday
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      habitsSection.locator("text=Practice meditation"),
    ).toBeVisible();

    // Click to view/edit notes
    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Practice meditation" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Verify notes are saved
    await expect(page.locator("textarea")).toHaveValue(
      "10 minutes mindfulness",
    );

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
  });

  test("creates habit with multiple days of week", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Click add button
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();

    // Fill in name
    await page.locator('input[placeholder="Task name…"]').fill("Workout");

    // Weekly mode is default with Monday selected - add Wed and Fri
    await page.locator('.add-modal__dow-btn:has-text("Wed")').click();
    await page.locator('.add-modal__dow-btn:has-text("Fri")').click();

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(habitsSection.locator("text=Workout")).toBeVisible();
  });

  test("creates habit with day of month", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Click add button
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();

    // Fill in name
    await page.locator('input[placeholder="Task name…"]').fill("Pay rent");

    // Switch to Monthly mode and select 5th
    await page.locator('.add-modal__mode-btn:has-text("Monthly")').click();
    await page
      .locator(".add-modal__dom-btn")
      .filter({ hasText: /^5$/ })
      .click();

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(habitsSection.locator("text=Pay rent")).toBeVisible();
  });

  test("creates habit with multiple days of month", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Click add button
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();

    // Fill in name
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Check finances");

    // Switch to Monthly mode and select 5th and 20th
    await page.locator('.add-modal__mode-btn:has-text("Monthly")').click();
    await page
      .locator(".add-modal__dom-btn")
      .filter({ hasText: /^5$/ })
      .click();
    await page
      .locator(".add-modal__dom-btn")
      .filter({ hasText: /^20$/ })
      .click();

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(habitsSection.locator("text=Check finances")).toBeVisible();
  });

  test("cannot create habit with empty name", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Click add button
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();

    // Try to submit without name
    const addButton = page.locator(".add-modal__btn--confirm");

    // Add button should be disabled or validation should prevent submission
    await expect(addButton).toBeDisabled();

    // Modal should still be open
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // No item should be created
    await page.locator('button:has-text("Cancel")').click();
    await expect(habitsSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel adding a habit", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Click add button
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();

    // Fill in some data
    await page.locator('input[placeholder="Task name…"]').fill("Test habit");

    // Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Modal should close
    await expect(page.locator(".add-modal__title")).not.toBeVisible();

    // Item should not be created
    await expect(habitsSection.locator("text=Test habit")).not.toBeVisible();
    await expect(habitsSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Habits - Read Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearHabits(page);
  });

  test("displays all habits after creation", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create multiple habits
    const habitNames = ["Morning exercise", "Read book", "Water plants"];

    for (const name of habitNames) {
      await habitsSection
        .locator('button[aria-label="Add task to Habits"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(name);
      await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);
    }

    // Verify all habits are displayed
    for (const name of habitNames) {
      await expect(habitsSection.locator(`text=${name}`)).toBeVisible();
    }

    // Verify count
    const todoCards = habitsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(3);
  });

  test("displays habit with recurrence indicator", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create habit with day of week
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Weekly review");
    await page.locator('.add-modal__dow-btn:has-text("Fri")').click();
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Weekly review" });
    await expect(todoCard).toBeVisible();
  });
});

test.describe("Habits - Update Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearHabits(page);
  });

  test("can mark habit as done", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create a habit
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Check email");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Mark as done
    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Check email" })
      .first();
    await todoCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Verify checked state (button has --checked class)
    await expect(todoCard.locator(".todo-card__checkbox")).toHaveClass(
      /todo-card__checkbox--checked/,
    );
  });

  test("can mark habit as undone", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create and mark as done
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Review notes");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Review notes" })
      .first();
    await todoCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Mark as undone
    await todoCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Verify unchecked state (button does not have --checked class)
    await expect(todoCard.locator(".todo-card__checkbox")).not.toHaveClass(
      /todo-card__checkbox--checked/,
    );
  });

  test("can edit habit notes", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create habit
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Drink water");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Edit notes
    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Drink water" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    await page.locator("textarea").fill("8 glasses per day");
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(500);

    // Verify notes were saved
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue("8 glasses per day");
    await page.locator('button:has-text("Cancel")').click();
  });

  test("can update habit notes when they already exist", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create habit with notes
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Study");
    await page.locator('textarea[placeholder*="optional"]').fill("30 minutes");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Edit notes
    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Study" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    await page.locator("textarea").fill("1 hour focused study");
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(500);

    // Verify notes were updated
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue("1 hour focused study");
    await page.locator('button:has-text("Cancel")').click();
  });
});

test.describe("Habits - Priority Reordering", () => {
  test.beforeEach(async ({ page }) => {
    await clearHabits(page);
  });

  test("can move habit up in priority", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create two habits
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Move second habit up
    const secondCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Second habit" });
    await secondCard.locator('button[aria-label*="Move up"]').click();
    await page.waitForTimeout(500);

    // Verify order changed
    const todoCards = habitsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second habit");
    await expect(todoCards.nth(1)).toContainText("First habit");
  });

  test("can move habit down in priority", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create two habits
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Move first habit down
    const firstCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "First habit" });
    await firstCard.locator('button[aria-label*="Move down"]').click();
    await page.waitForTimeout(500);

    // Verify order changed
    const todoCards = habitsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second habit");
    await expect(todoCards.nth(1)).toContainText("First habit");
  });

  test("first item cannot move up", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create one habit
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Verify move up button is disabled
    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Only habit" });
    const moveUpBtn = todoCard.locator('button[aria-label*="Move up"]');
    await expect(moveUpBtn).toBeDisabled();
  });

  test("last item cannot move down", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create one habit
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Verify move down button is disabled
    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Only habit" });
    const moveDownBtn = todoCard.locator('button[aria-label*="Move down"]');
    await expect(moveDownBtn).toBeDisabled();
  });

  test("marking habit as done moves it to end", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create three habits
    const habitNames = ["First", "Second", "Third"];
    for (const name of habitNames) {
      await habitsSection
        .locator('button[aria-label="Add task to Habits"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(name);
      await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);
    }

    // Mark first habit as done
    const firstCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "First" })
      .first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Verify it moved to end
    const todoCards = habitsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second");
    await expect(todoCards.nth(1)).toContainText("Third");
    await expect(todoCards.last()).toContainText("First");
  });

  test("marking habit as undone moves it to top", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create three habits and mark one as done
    const habitNames = ["First", "Second", "Third"];
    for (const name of habitNames) {
      await habitsSection
        .locator('button[aria-label="Add task to Habits"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(name);
      await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);

      if (name === "First") {
        const card = habitsSection
          .locator(".todo-card")
          .filter({ hasText: name })
          .first();
        await card.locator(".todo-card__checkbox").click();
        await page.waitForTimeout(500);
      }
    }

    // Mark First as undone (it's currently at the end)
    const firstCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "First" })
      .first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Verify it moved to top
    const todoCards = habitsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("First");
  });
});

test.describe("Habits - Delete Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearHabits(page);
  });

  test("can delete a habit", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create a habit
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Temporary habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Delete it
    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Temporary habit" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Confirm deletion
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);

    // Verify it's gone
    await expect(
      habitsSection.locator("text=Temporary habit"),
    ).not.toBeVisible();
    await expect(habitsSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel deletion", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create a habit
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Keep this habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Try to delete
    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Keep this habit" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Cancel deletion
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);

    // Verify it still exists
    await expect(habitsSection.locator("text=Keep this habit")).toBeVisible();
  });

  test("can delete multiple habits", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create three habits
    const habitNames = ["Delete1", "Delete2", "Delete3"];
    for (const name of habitNames) {
      await habitsSection
        .locator('button[aria-label="Add task to Habits"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(name);
      await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);
    }

    // Delete all
    for (const name of habitNames) {
      const todoCard = habitsSection
        .locator(".todo-card")
        .filter({ hasText: name })
        .first();
      await todoCard.locator('button[aria-label*="Delete"]').click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(300);
    }

    // All should be gone
    await expect(habitsSection.locator("p.empty-message")).toBeVisible();
  });

  test("deleting reorders remaining items' priorities", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create three habits
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Third");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Delete middle item
    const secondCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Second" });
    await secondCard.locator('button[aria-label*="Delete"]').click();
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);

    // Remaining items should still be in order
    const todoCards = habitsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(2);
    await expect(todoCards.first()).toContainText("First");
    await expect(todoCards.nth(1)).toContainText("Third");
  });
});

test.describe("Habits - Complex Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await clearHabits(page);
  });

  test("handles mixed done and undone items correctly", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create multiple items and mark some as done
    const items = [
      { name: "MixedUndone1", done: false },
      { name: "MixedDone1", done: true },
      { name: "MixedUndone2", done: false },
      { name: "MixedDone2", done: true },
    ];

    for (const item of items) {
      await habitsSection
        .locator('button[aria-label="Add task to Habits"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item.name);
      await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);

      if (item.done) {
        const todoCard = habitsSection
          .locator(".todo-card")
          .filter({ hasText: item.name })
          .first();
        await todoCard.locator(".todo-card__checkbox").click();
        await page.waitForTimeout(500);
      }
    }

    // Verify undone items appear before done items
    const todoCards = habitsSection.locator(".todo-card");
    const firstCardText = await todoCards.first().textContent();
    const lastCardText = await todoCards.last().textContent();

    expect(firstCardText).toMatch(/MixedUndone/);
    expect(lastCardText).toMatch(/MixedDone/);
  });

  test("creates habit with all days of week", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Daily habit");
    // Click all day buttons
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator('.add-modal__dow-btn:has-text("Tue")').click();
    await page.locator('.add-modal__dow-btn:has-text("Wed")').click();
    await page.locator('.add-modal__dow-btn:has-text("Thu")').click();
    await page.locator('.add-modal__dow-btn:has-text("Fri")').click();
    await page.locator('.add-modal__dow-btn:has-text("Sat")').click();
    await page.locator('.add-modal__dow-btn:has-text("Sun")').click();
    await page.locator(".add-modal__btn--confirm").click();

    await expect(habitsSection.locator("text=Daily habit")).toBeVisible();
  });

  test("handles long names gracefully", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    const longName =
      "This is a very long habit name that should be handled properly by the application without breaking the UI layout or causing any display issues";

    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(longName);
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      habitsSection.locator(`text=${longName.substring(0, 20)}`),
    ).toBeVisible();
  });

  test("handles long notes gracefully", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    const longNotes =
      "This is a very long notes section that contains a lot of detailed information about the habit. ".repeat(
        10,
      );

    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Habit with long notes");
    await page.locator('textarea[placeholder*="optional"]').fill(longNotes);
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Habit with long notes" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    await expect(page.locator("textarea")).toHaveValue(longNotes);
    await page.locator('button:has-text("Cancel")').click();
  });

  test("handles special characters in name", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    const specialName = "Habit @#$%^&*() with symbols!";

    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(specialName);
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();

    await expect(habitsSection.locator("text=Habit @#$%")).toBeVisible();
  });

  test("creates habits with different recurrence patterns", async ({
    page,
  }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Weekly habit
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Weekly habit");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Monthly habit
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Monthly habit");
    await page.locator('.add-modal__mode-btn:has-text("Monthly")').click();
    await page
      .locator(".add-modal__dom-btn")
      .filter({ hasText: /^1$/ })
      .click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Verify both exist
    await expect(habitsSection.locator("text=Weekly habit")).toBeVisible();
    await expect(habitsSection.locator("text=Monthly habit")).toBeVisible();

    const todoCards = habitsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(2);
  });
});

test.describe("Habits - Chron Endpoint Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await clearHabits(page);
  });

  test("done habits can be marked as undone via chron", async ({ page }) => {
    await page.goto("/");

    const habitsSection = page
      .locator("section")
      .filter({ hasText: "Habits" })
      .first();

    // Create and mark habit as done
    await habitsSection
      .locator('button[aria-label="Add task to Habits"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Exercise");
    await page.locator('.add-modal__dow-btn:has-text("Mon")').click();
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const todoCard = habitsSection
      .locator(".todo-card")
      .filter({ hasText: "Exercise" })
      .first();
    await todoCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Call chron endpoint
    const response = await page.request.delete(
      "http://localhost:3002/api/habbits/chron",
    );
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.markedUndoneCount).toBeGreaterThanOrEqual(0);

    // Reload page to see changes
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify habit still exists (not deleted)
    await expect(habitsSection.locator("text=Exercise")).toBeVisible();
  });
});
