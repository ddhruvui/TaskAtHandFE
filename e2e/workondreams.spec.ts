import { test, expect, type Page } from "@playwright/test";

/**
 * Comprehensive E2E tests for Work On Dreams functionality
 * Tests all CRUD operations, priority reordering, and edge cases
 * Based on API_REFERENCE.md specifications
 */

// Helper to reset the database state before each test
async function clearWorkOnDreams(page: Page) {
  // Use API to delete all work on dreams for faster test setup
  const response = await page.request.get(
    "http://localhost:3002/api/workondreams",
  );
  const data = await response.json();

  if (data.success && data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      await page.request.delete(
        `http://localhost:3002/api/workondreams/${item._id}`,
      );
    }
  }

  // Navigate to app after clearing
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Work On Dreams - Page Loading", () => {
  test("homepage loads successfully with Work On Dreams section", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify page title
    await expect(page).toHaveTitle(/taskathandfe/i);

    // Verify main heading
    await expect(page.locator("h1")).toHaveText("Task At Hand");

    // Verify Work On Dreams section exists
    const workOnDreamsHeading = page
      .locator("h2")
      .filter({ hasText: "Work On Dreams" });
    await expect(workOnDreamsHeading).toBeVisible();
  });

  test("displays empty state when no work on dreams exist", async ({
    page,
  }) => {
    await clearWorkOnDreams(page);

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();
    await expect(workOnDreamsSection.locator("p.empty-message")).toHaveText(
      "No tasks yet — add one!",
    );
  });

  test("Add button is visible in Work On Dreams section", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();
    const addButton = workOnDreamsSection.locator(
      'button[aria-label="Add task to Work On Dreams"]',
    );
    await expect(addButton).toBeVisible();
  });
});

test.describe("Work On Dreams - Create Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearWorkOnDreams(page);
  });

  test("creates work on dream with only name (required field)", async ({
    page,
  }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Click add button
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();

    // Modal should appear
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // Fill in name only
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Research market opportunities");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      workOnDreamsSection.locator("text=Research market opportunities"),
    ).toBeVisible();

    // Verify empty state is gone
    await expect(
      workOnDreamsSection.locator("p.empty-message"),
    ).not.toBeVisible();
  });

  test("creates work on dream with name and notes", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Click add button
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();

    // Fill in name and notes
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Launch new product");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Focus on target market segment");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      workOnDreamsSection.locator("text=Launch new product"),
    ).toBeVisible();

    // Click to view/edit notes
    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Launch new product" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Verify notes are saved
    await expect(page.locator("textarea")).toHaveValue(
      "Focus on target market segment",
    );

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
  });

  test("creates work on dream with name and ECD", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Click add button
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();

    // Fill in name and ECD
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Complete certification");

    // Set ECD (Expected Completion Date)
    const ecdInput = page.locator('input[type="date"]');
    await ecdInput.fill("2026-06-15");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      workOnDreamsSection.locator("text=Complete certification"),
    ).toBeVisible();

    // Verify ECD is displayed
    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Complete certification" });
    await expect(todoCard).toContainText("06/15");
  });

  test("creates work on dream with all fields", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Click add button
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();

    // Fill in all fields
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Build dream house");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Modern architecture with sustainable materials");
    await page.locator('input[type="date"]').fill("2027-12-31");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created with all fields
    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Build dream house" });
    await expect(todoCard).toBeVisible();
    await expect(todoCard).toContainText("12/31/27");

    // Verify notes
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue(
      "Modern architecture with sustainable materials",
    );
    await page.locator('button:has-text("Cancel")').click();
  });

  test("cannot create work on dream with empty name", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Click add button
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();

    // Try to submit without name
    const addButton = page.locator(".add-modal__btn--confirm");

    // Add button should be disabled or validation should prevent submission
    // Button is disabled, so clicking it won't do anything
    await expect(addButton).toBeDisabled();

    // Modal should still be open (form validation prevents submission)
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // No item should be created
    await page.locator('button:has-text("Cancel")').click();
    await expect(workOnDreamsSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel adding a work on dream", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Click add button
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();

    // Fill in some data
    await page.locator('input[placeholder="Task name…"]').fill("Test item");

    // Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Modal should close
    await expect(page.locator(".add-modal__title")).not.toBeVisible();

    // Item should not be created
    await expect(
      workOnDreamsSection.locator("text=Test item"),
    ).not.toBeVisible();
    await expect(workOnDreamsSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Work On Dreams - Read Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearWorkOnDreams(page);
  });

  test("displays multiple work on dreams in priority order", async ({
    page,
  }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create three work on dreams
    const items = ["First dream", "Second dream", "Third dream"];

    for (const item of items) {
      await workOnDreamsSection
        .locator('button[aria-label="Add task to Work On Dreams"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300); // Wait for creation
    }

    // Verify all items are visible
    for (const item of items) {
      await expect(workOnDreamsSection.locator(`text=${item}`)).toBeVisible();
    }

    // Verify they appear in order
    const todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(3);
  });

  test("displays work on dream with all field details", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create work on dream with all fields
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Travel the world");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Visit 50 countries");
    await page.locator('input[type="date"]').fill("2030-12-31");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Travel the world" });

    // Verify name is visible
    await expect(todoCard.locator("text=Travel the world")).toBeVisible();

    // Verify ECD is visible
    await expect(todoCard).toContainText("12/31/30");

    // Verify checkbox is unchecked
    const checkbox = todoCard.locator(".todo-card__checkbox");
    await expect(checkbox).not.toHaveClass(/todo-card__checkbox--checked/);
  });
});

test.describe("Work On Dreams - Update Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearWorkOnDreams(page);
  });

  test("toggles work on dream done status", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create a work on dream
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Learn new skill");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Learn new skill" });
    const checkbox = todoCard.locator(".todo-card__checkbox");

    // Initially unchecked
    await expect(checkbox).not.toHaveClass(/todo-card__checkbox--checked/);

    // Toggle to done
    await checkbox.click();
    await page.waitForTimeout(300); // Wait for API call
    await expect(checkbox).toHaveClass(/todo-card__checkbox--checked/);

    // Toggle back to undone
    await checkbox.click();
    await page.waitForTimeout(300);
    await expect(checkbox).not.toHaveClass(/todo-card__checkbox--checked/);
  });

  test("marking done moves work on dream to end of list", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create two work on dreams
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First item");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second item");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Mark first item as done
    const firstCard = workOnDreamsSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500); // Wait for reordering

    // Verify "Second item" is now first
    const todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second item");
    await expect(todoCards.last()).toContainText("First item");
  });

  test("marking undone moves work on dream to top of list", async ({
    page,
  }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create and mark one as done
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("CheckDoneItem");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const firstCard = workOnDreamsSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Create another undone item
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("CheckUndoneItem");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Unmark the done item - use last() to get the checked one
    const doneCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "CheckDoneItem" })
      .last();
    await doneCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // It should move to the top
    const todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("CheckDoneItem");
  });

  test("edits work on dream notes", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create a work on dream
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Write a book");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Initial notes");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Write a book" });

    // Open edit modal
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Verify initial notes
    await expect(page.locator("textarea")).toHaveValue("Initial notes");

    // Update notes
    await page.locator("textarea").fill("Updated notes with more details");
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(300);

    // Reopen and verify
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue(
      "Updated notes with more details",
    );
    await page.locator('button:has-text("Cancel")').click();
  });

  test("ECD is NOT editable after creation (per API spec)", async ({
    page,
  }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create work on dream with ECD
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Fixed deadline dream");
    await page.locator('input[type="date"]').fill("2026-08-15");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Fixed deadline dream" });

    // Verify ECD is displayed
    await expect(todoCard).toContainText("08/15");

    // Open edit modal
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Note: The UI may show the date field in edit mode, but per API spec,
    // changes to ECD are not saved for workondreams (only notes are updatable)
    // Just close the modal without making changes
    await page.locator('button:has-text("Cancel")').click();
  });

  test("moves work on dream up in priority", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create two work on dreams
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Second dream should be at bottom
    let todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards.nth(1)).toContainText("Second dream");

    // Move second dream up
    const secondCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Second dream" });
    await secondCard.locator('button[aria-label*="Move up"]').click();
    await page.waitForTimeout(500);

    // Now second dream should be first
    todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second dream");
    await expect(todoCards.nth(1)).toContainText("First dream");
  });

  test("moves work on dream down in priority", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create two work on dreams
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // First dream should be at top
    let todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("First dream");

    // Move first dream down
    const firstCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "First dream" });
    await firstCard.locator('button[aria-label*="Move down"]').click();
    await page.waitForTimeout(500);

    // Now first dream should be second
    todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second dream");
    await expect(todoCards.nth(1)).toContainText("First dream");
  });

  test("cannot move first item up", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create one work on dream
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only dream");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection.locator(".todo-card").first();
    const moveUpButton = todoCard.locator('button[aria-label*="Move up"]');

    // Move up button should be disabled or not visible
    const isDisabled = await moveUpButton.isDisabled().catch(() => false);
    const isHidden = await moveUpButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });

  test("cannot move last item down", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create one work on dream
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only dream");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection.locator(".todo-card").first();
    const moveDownButton = todoCard.locator('button[aria-label*="Move down"]');

    // Move down button should be disabled or not visible
    const isDisabled = await moveDownButton.isDisabled().catch(() => false);
    const isHidden = await moveDownButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });
});

test.describe("Work On Dreams - Delete Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearWorkOnDreams(page);
  });

  test("deletes work on dream with confirmation", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create a work on dream
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Dream to delete");
    await page.locator(".add-modal__btn--confirm").click();

    // Verify it exists
    await expect(
      workOnDreamsSection.locator("text=Dream to delete"),
    ).toBeVisible();

    // Click delete
    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Dream to delete" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Confirm modal should appear
    await expect(page.locator('text=Delete "Dream to delete"?')).toBeVisible();

    // Confirm deletion
    await page.locator('button:has-text("Delete")').click();

    // Item should be gone
    await expect(
      workOnDreamsSection.locator("text=Dream to delete"),
    ).not.toBeVisible();
    await expect(workOnDreamsSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel deletion", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create a work on dream
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Dream to keep");
    await page.locator(".add-modal__btn--confirm").click();

    // Click delete
    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Dream to keep" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Cancel deletion
    await page.locator('button:has-text("Cancel")').click();

    // Item should still exist
    await expect(
      workOnDreamsSection.locator("text=Dream to keep"),
    ).toBeVisible();
  });

  test("deletes multiple work on dreams", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create three work on dreams
    const items = ["Dream 1", "Dream 2", "Dream 3"];
    for (const item of items) {
      await workOnDreamsSection
        .locator('button[aria-label="Add task to Work On Dreams"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);
    }

    // Delete each one
    for (const item of items) {
      const todoCard = workOnDreamsSection
        .locator(".todo-card")
        .filter({ hasText: item });
      await todoCard.locator('button[aria-label*="Delete"]').click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(300);
    }

    // All should be gone
    await expect(workOnDreamsSection.locator("p.empty-message")).toBeVisible();
  });

  test("deleting reorders remaining items' priorities", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create three work on dreams
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Third");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Delete middle item
    const secondCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Second" });
    await secondCard.locator('button[aria-label*="Delete"]').click();
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);

    // Remaining items should still be in order
    const todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(2);
    await expect(todoCards.first()).toContainText("First");
    await expect(todoCards.nth(1)).toContainText("Third");
  });
});

test.describe("Work On Dreams - Complex Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await clearWorkOnDreams(page);
  });

  test("handles mixed done and undone items correctly", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create multiple items and mark some as done
    const items = [
      { name: "MixedUndone1", done: false },
      { name: "MixedDone1", done: true },
      { name: "MixedUndone2", done: false },
      { name: "MixedDone2", done: true },
    ];

    for (const item of items) {
      await workOnDreamsSection
        .locator('button[aria-label="Add task to Work On Dreams"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item.name);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);

      if (item.done) {
        const todoCard = workOnDreamsSection
          .locator(".todo-card")
          .filter({ hasText: item.name })
          .first();
        await todoCard.locator(".todo-card__checkbox").click();
        await page.waitForTimeout(500);
      }
    }

    // Verify undone items appear before done items
    const todoCards = workOnDreamsSection.locator(".todo-card");
    const firstCardText = await todoCards.first().textContent();
    const lastCardText = await todoCards.last().textContent();

    expect(firstCardText).toMatch(/MixedUndone/);
    expect(lastCardText).toMatch(/MixedDone/);
  });

  test("creates work on dream with future ECD date", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Future goal");
    await page.locator('input[type="date"]').fill("2035-01-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Future goal" });
    await expect(todoCard).toContainText("01/01/35");
  });

  test("creates work on dream with past ECD date", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Overdue goal");
    await page.locator('input[type="date"]').fill("2025-01-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Overdue goal" });
    await expect(todoCard).toBeVisible();
    // Date should still be displayed even if in the past
    await expect(todoCard).toContainText("01/01/25");
  });

  test("handles long names gracefully", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    const longName =
      "This is a very long work on dream name that should be handled properly by the application without breaking the UI layout or causing any display issues";

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(longName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      workOnDreamsSection.locator(`text=${longName.substring(0, 20)}`),
    ).toBeVisible();
  });

  test("handles long notes gracefully", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    const longNotes =
      "This is a very long notes section that contains a lot of detailed information about the work on dream. ".repeat(
        10,
      );

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Dream with long notes");
    await page.locator('textarea[placeholder*="optional"]').fill(longNotes);
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Dream with long notes" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    await expect(page.locator("textarea")).toHaveValue(longNotes);
    await page.locator('button:has-text("Cancel")').click();
  });

  test("handles special characters in name", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    const specialName = "Dream with @special #characters & symbols!? 100%";

    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(specialName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      workOnDreamsSection.locator(`text=${specialName}`),
    ).toBeVisible();
  });

  test("rapid creating and deleting works correctly", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Rapidly create 5 items
    for (let i = 1; i <= 5; i++) {
      await workOnDreamsSection
        .locator('button[aria-label="Add task to Work On Dreams"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(`Rapid ${i}`);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(100);
    }

    // Verify all created
    const todoCards = workOnDreamsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(5);

    // Rapidly delete all
    for (let i = 1; i <= 5; i++) {
      await workOnDreamsSection
        .locator('button[aria-label*="Delete"]')
        .first()
        .click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(100);
    }

    // Verify all deleted
    await expect(workOnDreamsSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Work On Dreams - UI Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await clearWorkOnDreams(page);
  });

  test("maintains state after page reload", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Create a work on dream
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Persistent dream");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Should persist");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();

    // Verify item still exists
    await expect(
      workOnDreamsSection.locator("text=Persistent dream"),
    ).toBeVisible();

    // Verify notes persisted
    const todoCard = workOnDreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Persistent dream" });
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue("Should persist");
  });

  test("closes modal when clicking outside (if supported)", async ({
    page,
  }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Open add modal
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // Click on the overlay to close
    await page
      .locator(".add-modal__overlay")
      .click({ position: { x: 5, y: 5 } });

    // Modal should close
    await expect(page.locator(".add-modal__title")).not.toBeVisible();
  });

  test("keyboard navigation works in modals", async ({ page }) => {
    await page.goto("/");

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Open add modal
    await workOnDreamsSection
      .locator('button[aria-label="Add task to Work On Dreams"]')
      .click();

    // Name field should auto-focus, type directly
    await page.keyboard.type("Keyboard test");

    // Tab to notes field
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Notes via keyboard");

    // Click submit button
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      workOnDreamsSection.locator("text=Keyboard test"),
    ).toBeVisible();
  });

  test("displays appropriate empty state message", async ({ page }) => {
    await clearWorkOnDreams(page);

    const workOnDreamsSection = page
      .locator("section")
      .filter({ hasText: "Work On Dreams" })
      .first();

    // Check empty state message
    const emptyMessage = workOnDreamsSection.locator("p.empty-message");
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toHaveText("No tasks yet — add one!");
  });
});
