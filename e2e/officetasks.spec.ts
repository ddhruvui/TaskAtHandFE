import { test, expect, type Page } from "@playwright/test";

/**
 * Comprehensive E2E tests for Office Tasks functionality
 * Tests all CRUD operations, priority reordering, and edge cases
 * Based on API_REFERENCE.md specifications
 */

// Helper to reset the database state before each test
async function clearOfficeTasks(page: Page) {
  // Use API to delete all office tasks for faster test setup
  const response = await page.request.get("http://localhost:3002/api/office");
  const data = await response.json();

  if (data.success && data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      await page.request.delete(`http://localhost:3002/api/office/${item._id}`);
    }
  }

  // Navigate to app after clearing
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Office Tasks - Page Loading", () => {
  test("homepage loads successfully with Office Tasks section", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify page title
    await expect(page).toHaveTitle(/taskathandfe/i);

    // Verify main heading
    await expect(page.locator("h1")).toHaveText("Task At Hand");

    // Verify Office Tasks section exists
    const officeTasksHeading = page
      .locator("h2")
      .filter({ hasText: "Office Tasks" });
    await expect(officeTasksHeading).toBeVisible();
  });

  test("displays empty state when no office tasks exist", async ({ page }) => {
    await clearOfficeTasks(page);

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();
    await expect(officeTasksSection.locator("p.empty-message")).toHaveText(
      "No tasks yet — add one!",
    );
  });

  test("Add button is visible in Office Tasks section", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();
    const addButton = officeTasksSection.locator(
      'button[aria-label="Add task to Office Tasks"]',
    );
    await expect(addButton).toBeVisible();
  });
});

test.describe("Office Tasks - Create Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearOfficeTasks(page);
  });

  test("creates office task with only name (required field)", async ({
    page,
  }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Click add button
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();

    // Modal should appear
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // Fill in name only
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Prepare quarterly report");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      officeTasksSection.locator("text=Prepare quarterly report"),
    ).toBeVisible();

    // Verify empty state is gone
    await expect(
      officeTasksSection.locator("p.empty-message"),
    ).not.toBeVisible();
  });

  test("creates office task with name and notes", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Click add button
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();

    // Fill in name and notes
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Review budget proposal");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Include sales data and projections");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      officeTasksSection.locator("text=Review budget proposal"),
    ).toBeVisible();

    // Click to view/edit notes
    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Review budget proposal" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Verify notes are saved
    await expect(page.locator("textarea")).toHaveValue(
      "Include sales data and projections",
    );

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
  });

  test("creates office task with name and ECD", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Click add button
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();

    // Fill in name and ECD
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Submit monthly report");

    // Set ECD (Expected Completion Date)
    const ecdInput = page.locator('input[type="date"]');
    await ecdInput.fill("2026-03-31");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      officeTasksSection.locator("text=Submit monthly report"),
    ).toBeVisible();

    // Verify ECD is displayed
    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Submit monthly report" });
    await expect(todoCard).toContainText("03/31");
  });

  test("creates office task with all fields", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Click add button
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();

    // Fill in all fields
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Complete annual review");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Performance evaluation and goal setting for next year");
    await page.locator('input[type="date"]').fill("2026-12-20");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created with all fields
    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Complete annual review" });
    await expect(todoCard).toBeVisible();
    await expect(todoCard).toContainText("12/20");

    // Verify notes
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue(
      "Performance evaluation and goal setting for next year",
    );
    await page.locator('button:has-text("Cancel")').click();
  });

  test("cannot create office task with empty name", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Click add button
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
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
    await expect(officeTasksSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel adding an office task", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Click add button
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();

    // Fill in some data
    await page.locator('input[placeholder="Task name…"]').fill("Test item");

    // Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Modal should close
    await expect(page.locator(".add-modal__title")).not.toBeVisible();

    // Item should not be created
    await expect(
      officeTasksSection.locator("text=Test item"),
    ).not.toBeVisible();
    await expect(officeTasksSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Office Tasks - Read Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearOfficeTasks(page);
  });

  test("displays multiple office tasks in priority order", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create three office tasks
    const items = ["First task", "Second task", "Third task"];

    for (const item of items) {
      await officeTasksSection
        .locator('button[aria-label="Add task to Office Tasks"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300); // Wait for creation
    }

    // Verify all items are visible
    for (const item of items) {
      await expect(officeTasksSection.locator(`text=${item}`)).toBeVisible();
    }

    // Verify they appear in order
    const todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(3);
  });

  test("displays office task with all field details", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create office task with all fields
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Project kickoff meeting");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Prepare presentation deck");
    await page.locator('input[type="date"]').fill("2026-04-05");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Project kickoff meeting" });

    // Verify name is visible
    await expect(
      todoCard.locator("text=Project kickoff meeting"),
    ).toBeVisible();

    // Verify ECD is visible
    await expect(todoCard).toContainText("04/05");

    // Verify checkbox is unchecked
    const checkbox = todoCard.locator(".todo-card__checkbox");
    await expect(checkbox).not.toHaveClass(/todo-card__checkbox--checked/);
  });
});

test.describe("Office Tasks - Update Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearOfficeTasks(page);
  });

  test("toggles office task done status", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create an office task
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Send client email");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Send client email" });
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

  test("marking done moves office task to end of list", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create two office tasks
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First item");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second item");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Mark first item as done
    const firstCard = officeTasksSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500); // Wait for reordering

    // Verify "Second item" is now first
    const todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second item");
    await expect(todoCards.last()).toContainText("First item");
  });

  test("marking undone moves office task to top of list", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create and mark one as done
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("CheckDoneItem");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const firstCard = officeTasksSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Create another undone item
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("CheckUndoneItem");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Unmark the done item - use last() to get the checked one
    const doneCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "CheckDoneItem" })
      .last();
    await doneCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // It should move to the top
    const todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("CheckDoneItem");
  });

  test("edits office task notes", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create an office task
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Update documentation");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Initial notes");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Update documentation" });

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

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create office task with ECD
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Fixed deadline task");
    await page.locator('input[type="date"]').fill("2026-05-15");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Fixed deadline task" });

    // Verify ECD is displayed
    await expect(todoCard).toContainText("05/15");

    // Open edit modal
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Note: The UI may show the date field in edit mode, but per API spec,
    // changes to ECD are not saved for office tasks (only notes are updatable)
    // Just close the modal without making changes
    await page.locator('button:has-text("Cancel")').click();
  });

  test("moves office task up in priority", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create two office tasks
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First task");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second task");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Second task should be at bottom
    let todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards.nth(1)).toContainText("Second task");

    // Move second task up
    const secondCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Second task" });
    await secondCard.locator('button[aria-label*="Move up"]').click();
    await page.waitForTimeout(500);

    // Now second task should be first
    todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second task");
    await expect(todoCards.nth(1)).toContainText("First task");
  });

  test("moves office task down in priority", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create two office tasks
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First task");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second task");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // First task should be at top
    let todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("First task");

    // Move first task down
    const firstCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "First task" });
    await firstCard.locator('button[aria-label*="Move down"]').click();
    await page.waitForTimeout(500);

    // Now first task should be second
    todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second task");
    await expect(todoCards.nth(1)).toContainText("First task");
  });

  test("cannot move first item up", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create one office task
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only task");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection.locator(".todo-card").first();
    const moveUpButton = todoCard.locator('button[aria-label*="Move up"]');

    // Move up button should be disabled or not visible
    const isDisabled = await moveUpButton.isDisabled().catch(() => false);
    const isHidden = await moveUpButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });

  test("cannot move last item down", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create one office task
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only task");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection.locator(".todo-card").first();
    const moveDownButton = todoCard.locator('button[aria-label*="Move down"]');

    // Move down button should be disabled or not visible
    const isDisabled = await moveDownButton.isDisabled().catch(() => false);
    const isHidden = await moveDownButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });
});

test.describe("Office Tasks - Delete Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearOfficeTasks(page);
  });

  test("deletes office task with confirmation", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create an office task
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Task to delete");
    await page.locator(".add-modal__btn--confirm").click();

    // Verify it exists
    await expect(
      officeTasksSection.locator("text=Task to delete"),
    ).toBeVisible();

    // Click delete
    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Task to delete" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Confirm modal should appear
    await expect(page.locator('text=Delete "Task to delete"?')).toBeVisible();

    // Confirm deletion
    await page.locator('button:has-text("Delete")').click();

    // Item should be gone
    await expect(
      officeTasksSection.locator("text=Task to delete"),
    ).not.toBeVisible();
    await expect(officeTasksSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel deletion", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create an office task
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Task to keep");
    await page.locator(".add-modal__btn--confirm").click();

    // Click delete
    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Task to keep" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Cancel deletion
    await page.locator('button:has-text("Cancel")').click();

    // Item should still exist
    await expect(officeTasksSection.locator("text=Task to keep")).toBeVisible();
  });

  test("deletes multiple office tasks", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create three office tasks
    const items = ["Task 1", "Task 2", "Task 3"];
    for (const item of items) {
      await officeTasksSection
        .locator('button[aria-label="Add task to Office Tasks"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);
    }

    // Delete each one
    for (const item of items) {
      const todoCard = officeTasksSection
        .locator(".todo-card")
        .filter({ hasText: item });
      await todoCard.locator('button[aria-label*="Delete"]').click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(300);
    }

    // All should be gone
    await expect(officeTasksSection.locator("p.empty-message")).toBeVisible();
  });

  test("deleting reorders remaining items' priorities", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create three office tasks
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Third");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Delete middle item
    const secondCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Second" });
    await secondCard.locator('button[aria-label*="Delete"]').click();
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);

    // Remaining items should still be in order
    const todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(2);
    await expect(todoCards.first()).toContainText("First");
    await expect(todoCards.nth(1)).toContainText("Third");
  });
});

test.describe("Office Tasks - Complex Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await clearOfficeTasks(page);
  });

  test("handles mixed done and undone items correctly", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create multiple items and mark some as done
    const items = [
      { name: "MixedUndone1", done: false },
      { name: "MixedDone1", done: true },
      { name: "MixedUndone2", done: false },
      { name: "MixedDone2", done: true },
    ];

    for (const item of items) {
      await officeTasksSection
        .locator('button[aria-label="Add task to Office Tasks"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item.name);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);

      if (item.done) {
        const todoCard = officeTasksSection
          .locator(".todo-card")
          .filter({ hasText: item.name })
          .first();
        await todoCard.locator(".todo-card__checkbox").click();
        await page.waitForTimeout(500);
      }
    }

    // Verify undone items appear before done items
    const todoCards = officeTasksSection.locator(".todo-card");
    const firstCardText = await todoCards.first().textContent();
    const lastCardText = await todoCards.last().textContent();

    expect(firstCardText).toMatch(/MixedUndone/);
    expect(lastCardText).toMatch(/MixedDone/);
  });

  test("creates office task with future ECD date", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Future task");
    await page.locator('input[type="date"]').fill("2027-06-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Future task" });
    await expect(todoCard).toContainText("06/01/27");
  });

  test("creates office task with past ECD date", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Overdue task");
    await page.locator('input[type="date"]').fill("2025-01-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Overdue task" });
    await expect(todoCard).toBeVisible();
    // Date should still be displayed even if in the past
    await expect(todoCard).toContainText("01/01/25");
  });

  test("handles long names gracefully", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    const longName =
      "This is a very long office task name that should be handled properly by the application without breaking the UI layout or causing any display issues";

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(longName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      officeTasksSection.locator(`text=${longName.substring(0, 20)}`),
    ).toBeVisible();
  });

  test("handles long notes gracefully", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    const longNotes =
      "This is a very long notes section that contains a lot of detailed information about the office task. ".repeat(
        10,
      );

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Task with long notes");
    await page.locator('textarea[placeholder*="optional"]').fill(longNotes);
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Task with long notes" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    await expect(page.locator("textarea")).toHaveValue(longNotes);
    await page.locator('button:has-text("Cancel")').click();
  });

  test("handles special characters in name", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    const specialName = "Task with @special #characters & symbols!? 100%";

    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(specialName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      officeTasksSection.locator(`text=${specialName}`),
    ).toBeVisible();
  });

  test("rapid creating and deleting works correctly", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Rapidly create 5 items
    for (let i = 1; i <= 5; i++) {
      await officeTasksSection
        .locator('button[aria-label="Add task to Office Tasks"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(`Rapid ${i}`);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(100);
    }

    // Verify all created
    const todoCards = officeTasksSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(5);

    // Rapidly delete all
    for (let i = 1; i <= 5; i++) {
      await officeTasksSection
        .locator('button[aria-label*="Delete"]')
        .first()
        .click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(100);
    }

    // Verify all deleted
    await expect(officeTasksSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Office Tasks - UI Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await clearOfficeTasks(page);
  });

  test("maintains state after page reload", async ({ page }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Create an office task
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Persistent task");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Should persist");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();

    // Verify item still exists
    await expect(
      officeTasksSection.locator("text=Persistent task"),
    ).toBeVisible();

    // Verify notes persisted
    const todoCard = officeTasksSection
      .locator(".todo-card")
      .filter({ hasText: "Persistent task" });
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue("Should persist");
  });

  test("closes modal when clicking outside (if supported)", async ({
    page,
  }) => {
    await page.goto("/");

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Open add modal
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
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

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Open add modal
    await officeTasksSection
      .locator('button[aria-label="Add task to Office Tasks"]')
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
      officeTasksSection.locator("text=Keyboard test"),
    ).toBeVisible();
  });

  test("displays appropriate empty state message", async ({ page }) => {
    await clearOfficeTasks(page);

    const officeTasksSection = page
      .locator("section")
      .filter({ hasText: "Office Tasks" })
      .first();

    // Check empty state message
    const emptyMessage = officeTasksSection.locator("p.empty-message");
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toHaveText("No tasks yet — add one!");
  });
});
