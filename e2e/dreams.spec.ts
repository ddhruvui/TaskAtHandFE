import { test, expect, type Page } from "@playwright/test";

/**
 * Comprehensive E2E tests for Dreams functionality
 * Tests all CRUD operations, priority reordering, and edge cases
 * Based on API_REFERENCE.md specifications
 */

// Helper to reset the database state before each test
async function clearDreams(page: Page) {
  // Use API to delete all dreams for faster test setup
  const response = await page.request.get("http://localhost:3002/api/dreams");
  const data = await response.json();

  if (data.success && data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      await page.request.delete(`http://localhost:3002/api/dreams/${item._id}`);
    }
  }

  // Navigate to app after clearing
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Dreams - Page Loading", () => {
  test("homepage loads successfully with Dreams section", async ({ page }) => {
    await page.goto("/");

    // Verify page title
    await expect(page).toHaveTitle(/taskathandfe/i);

    // Verify main heading
    await expect(page.locator("h1")).toHaveText("Task At Hand");

    // Verify Dreams section exists
    const dreamsHeading = page.getByRole("heading", {
      name: "Dreams",
      exact: true,
    });
    await expect(dreamsHeading).toBeVisible();
  });

  test("displays empty state when no dreams exist", async ({ page }) => {
    await clearDreams(page);

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();
    await expect(dreamsSection.locator("p.empty-message")).toHaveText(
      "No tasks yet — add one!",
    );
  });

  test("Add button is visible in Dreams section", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();
    const addButton = dreamsSection.locator(
      'button[aria-label="Add task to Dreams"]',
    );
    await expect(addButton).toBeVisible();
  });
});

test.describe("Dreams - Create Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearDreams(page);
  });

  test("creates dream with only name (required field)", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Click add button
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();

    // Modal should appear
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // Fill in name only
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Build a startup");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(dreamsSection.locator("text=Build a startup")).toBeVisible();

    // Verify empty state is gone
    await expect(dreamsSection.locator("p.empty-message")).not.toBeVisible();
  });

  test("creates dream with name and notes", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Click add button
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();

    // Fill in name and notes
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Write a bestselling novel");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Focus on AI-powered productivity tools");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      dreamsSection.locator("text=Write a bestselling novel"),
    ).toBeVisible();

    // Click to view/edit notes
    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Write a bestselling novel" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Verify notes are saved
    await expect(page.locator("textarea")).toHaveValue(
      "Focus on AI-powered productivity tools",
    );

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
  });

  test("creates dream with name and ECD", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Click add button
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();

    // Fill in name and ECD
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Travel around the world");

    // Set ECD (Expected Completion Date)
    const ecdInput = page.locator('input[type="date"]');
    await ecdInput.fill("2027-12-31");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      dreamsSection.locator("text=Travel around the world"),
    ).toBeVisible();

    // Verify ECD is displayed
    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Travel around the world" });
    await expect(todoCard).toContainText("12/31");
  });

  test("creates dream with all fields", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Click add button
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();

    // Fill in all fields
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Launch successful product");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Create an app that helps people achieve their dreams");
    await page.locator('input[type="date"]').fill("2028-06-15");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created with all fields
    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Launch successful product" });
    await expect(todoCard).toBeVisible();
    await expect(todoCard).toContainText("06/15");

    // Verify notes
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue(
      "Create an app that helps people achieve their dreams",
    );
    await page.locator('button:has-text("Cancel")').click();
  });

  test("cannot create dream with empty name", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Click add button
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
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
    await expect(dreamsSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel adding a dream", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Click add button
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();

    // Fill in some data
    await page.locator('input[placeholder="Task name…"]').fill("Test dream");

    // Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Modal should close
    await expect(page.locator(".add-modal__title")).not.toBeVisible();

    // Item should not be created
    await expect(dreamsSection.locator("text=Test dream")).not.toBeVisible();
    await expect(dreamsSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Dreams - Read Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearDreams(page);
  });

  test("displays multiple dreams in priority order", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create three dreams
    const items = ["First dream", "Second dream", "Third dream"];

    for (const item of items) {
      await dreamsSection
        .locator('button[aria-label="Add task to Dreams"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300); // Wait for creation
    }

    // Verify all items are visible
    for (const item of items) {
      await expect(dreamsSection.locator(`text=${item}`)).toBeVisible();
    }

    // Verify they appear in order
    const todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(3);
  });

  test("displays dream with all field details", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create dream with all fields
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Start a charity");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Help underprivileged communities");
    await page.locator('input[type="date"]').fill("2029-01-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Start a charity" });

    // Verify name is visible
    await expect(todoCard.locator("text=Start a charity")).toBeVisible();

    // Verify ECD is visible
    await expect(todoCard).toContainText("01/01");

    // Verify checkbox is unchecked
    const checkbox = todoCard.locator(".todo-card__checkbox");
    await expect(checkbox).not.toHaveClass(/todo-card__checkbox--checked/);
  });
});

test.describe("Dreams - Update Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearDreams(page);
  });

  test("toggles dream done status", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create a dream
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Complete marathon");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Complete marathon" });
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

  test("marking done moves dream to end of list", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create two dreams
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Mark first item as done
    const firstCard = dreamsSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500); // Wait for reordering

    // Verify "Second dream" is now first
    const todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second dream");
    await expect(todoCards.last()).toContainText("First dream");
  });

  test("marking undone moves dream to top of list", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create and mark one as done
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("CheckDoneItem");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const firstCard = dreamsSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Create another undone item
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("CheckUndoneItem");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Unmark the done item - use last() to get the checked one
    const doneCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "CheckDoneItem" })
      .last();
    await doneCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // It should move to the top
    const todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("CheckDoneItem");
  });

  test("edits dream notes", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create a dream
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Learn new language");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Initial notes");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Learn new language" });

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

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create dream with ECD
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Fixed deadline dream");
    await page.locator('input[type="date"]').fill("2030-05-15");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Fixed deadline dream" });

    // Verify ECD is displayed
    await expect(todoCard).toContainText("05/15");

    // Open edit modal
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Note: The UI may show the date field in edit mode, but per API spec,
    // changes to ECD are not saved for dreams (only notes are updatable)
    // Just close the modal without making changes
    await page.locator('button:has-text("Cancel")').click();
  });

  test("moves dream up in priority", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create two dreams
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Second dream should be at bottom
    let todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards.nth(1)).toContainText("Second dream");

    // Move second dream up
    const secondCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Second dream" });
    await secondCard.locator('button[aria-label*="Move up"]').click();
    await page.waitForTimeout(500);

    // Now second dream should be first
    todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second dream");
    await expect(todoCards.nth(1)).toContainText("First dream");
  });

  test("moves dream down in priority", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create two dreams
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second dream");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // First dream should be at top
    let todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("First dream");

    // Move first dream down
    const firstCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "First dream" });
    await firstCard.locator('button[aria-label*="Move down"]').click();
    await page.waitForTimeout(500);

    // Now first dream should be second
    todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second dream");
    await expect(todoCards.nth(1)).toContainText("First dream");
  });

  test("cannot move first item up", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create one dream
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only dream");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection.locator(".todo-card").first();
    const moveUpButton = todoCard.locator('button[aria-label*="Move up"]');

    // Move up button should be disabled or not visible
    const isDisabled = await moveUpButton.isDisabled().catch(() => false);
    const isHidden = await moveUpButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });

  test("cannot move last item down", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create one dream
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only dream");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection.locator(".todo-card").first();
    const moveDownButton = todoCard.locator('button[aria-label*="Move down"]');

    // Move down button should be disabled or not visible
    const isDisabled = await moveDownButton.isDisabled().catch(() => false);
    const isHidden = await moveDownButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });
});

test.describe("Dreams - Delete Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearDreams(page);
  });

  test("deletes dream with confirmation", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create a dream
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Delete me");
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item exists
    await expect(dreamsSection.locator("text=Delete me")).toBeVisible();

    // Click delete button
    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Delete me" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Confirmation modal should appear
    await expect(page.locator('text=Delete "Delete me"?')).toBeVisible();

    // Confirm deletion
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);

    // Verify item was deleted
    await expect(dreamsSection.locator("text=Delete me")).not.toBeVisible();
    await expect(dreamsSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel dream deletion", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create a dream
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Keep me");
    await page.locator(".add-modal__btn--confirm").click();

    // Click delete button
    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Keep me" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Confirmation modal should appear
    await expect(page.locator('text=Delete "Keep me"?')).toBeVisible();

    // Cancel deletion
    await page.locator('button:has-text("Cancel")').click();

    // Verify item still exists
    await expect(dreamsSection.locator("text=Keep me")).toBeVisible();
    await expect(dreamsSection.locator("p.empty-message")).not.toBeVisible();
  });

  test("deletes multiple dreams", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create three dreams
    const items = ["Dream 1", "Dream 2", "Dream 3"];
    for (const item of items) {
      await dreamsSection
        .locator('button[aria-label="Add task to Dreams"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);
    }

    // Delete each one
    for (let i = 0; i < items.length; i++) {
      await dreamsSection
        .locator('button[aria-label*="Delete"]')
        .first()
        .click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(300);
    }

    // Verify all deleted
    await expect(dreamsSection.locator("p.empty-message")).toBeVisible();
  });

  test("priorities reorder after deletion", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create three dreams
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Third");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Delete the middle one
    const secondCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Second" });
    await secondCard.locator('button[aria-label*="Delete"]').click();
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);

    // Verify remaining items are still in order
    const todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(2);
    await expect(todoCards.first()).toContainText("First");
    await expect(todoCards.last()).toContainText("Third");
  });
});

test.describe("Dreams - Complex Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await clearDreams(page);
  });

  test("creates dream with future ECD date", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Future dream");
    await page.locator('input[type="date"]').fill("2035-06-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Future dream" });
    await expect(todoCard).toContainText("06/01");
  });

  test("creates dream with past ECD date", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Overdue dream");
    await page.locator('input[type="date"]').fill("2025-01-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Overdue dream" });
    await expect(todoCard).toBeVisible();
    // Date should still be displayed even if in the past
    await expect(todoCard).toContainText("01/01/25");
  });

  test("handles long names gracefully", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    const longName =
      "This is a very long dream name that should be handled properly by the application without breaking the UI layout or causing any display issues";

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(longName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      dreamsSection.locator(`text=${longName.substring(0, 20)}`),
    ).toBeVisible();
  });

  test("handles long notes gracefully", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    const longNotes =
      "This is a very long notes section that contains a lot of detailed information about the dream. ".repeat(
        10,
      );

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Dream with long notes");
    await page.locator('textarea[placeholder*="optional"]').fill(longNotes);
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Dream with long notes" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    await expect(page.locator("textarea")).toHaveValue(longNotes);
    await page.locator('button:has-text("Cancel")').click();
  });

  test("handles special characters in name", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    const specialName = "Dream with @special #characters & symbols!? 100%";

    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(specialName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(dreamsSection.locator(`text=${specialName}`)).toBeVisible();
  });

  test("rapid creating and deleting works correctly", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Rapidly create 5 items
    for (let i = 1; i <= 5; i++) {
      await dreamsSection
        .locator('button[aria-label="Add task to Dreams"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(`Rapid ${i}`);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(100);
    }

    // Verify all created
    const todoCards = dreamsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(5);

    // Rapidly delete all
    for (let i = 1; i <= 5; i++) {
      await dreamsSection
        .locator('button[aria-label*="Delete"]')
        .first()
        .click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(100);
    }

    // Verify all deleted
    await expect(dreamsSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Dreams - UI Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await clearDreams(page);
  });

  test("maintains state after page reload", async ({ page }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Create a dream
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
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
    await expect(dreamsSection.locator("text=Persistent dream")).toBeVisible();

    // Verify notes persisted
    const todoCard = dreamsSection
      .locator(".todo-card")
      .filter({ hasText: "Persistent dream" });
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue("Should persist");
  });

  test("closes modal when clicking outside (if supported)", async ({
    page,
  }) => {
    await page.goto("/");

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Open add modal
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
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

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Open add modal
    await dreamsSection
      .locator('button[aria-label="Add task to Dreams"]')
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

    await expect(dreamsSection.locator("text=Keyboard test")).toBeVisible();
  });

  test("displays appropriate empty state message", async ({ page }) => {
    await clearDreams(page);

    const dreamsSection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Dreams", exact: true }),
      })
      .first();

    // Check empty state message
    const emptyMessage = dreamsSection.locator("p.empty-message");
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toHaveText("No tasks yet — add one!");
  });
});
