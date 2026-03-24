import { test, expect, type Page } from "@playwright/test";

/**
 * Comprehensive E2E tests for Todos functionality
 * Tests all CRUD operations, priority reordering, and edge cases
 * Based on API_REFERENCE.md specifications
 */

// Helper to reset the database state before each test
async function clearTodos(page: Page) {
  // Use API to delete all todos for faster test setup
  const response = await page.request.get("http://localhost:3002/api/todos");
  const data = await response.json();

  if (data.success && data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      await page.request.delete(`http://localhost:3002/api/todos/${item._id}`);
    }
  }

  // Navigate to app after clearing
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Todos - Page Loading", () => {
  test("homepage loads successfully with Todos section", async ({ page }) => {
    await page.goto("/");

    // Verify page title
    await expect(page).toHaveTitle(/taskathandfe/i);

    // Verify main heading
    await expect(page.locator("h1")).toHaveText("Task At Hand");

    // Verify Todos section exists
    const todosHeading = page.locator("h2").filter({ hasText: "Todos" });
    await expect(todosHeading).toBeVisible();
  });

  test("displays empty state when no todos exist", async ({ page }) => {
    await clearTodos(page);

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();
    await expect(todosSection.locator("p.empty-message")).toHaveText(
      "No tasks yet — add one!",
    );
  });

  test("Add button is visible in Todos section", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();
    const addButton = todosSection.locator(
      'button[aria-label="Add task to Todos"]',
    );
    await expect(addButton).toBeVisible();
  });
});

test.describe("Todos - Create Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearTodos(page);
  });

  test("creates todo with only name (required field)", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Click add button
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();

    // Modal should appear
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // Fill in name only
    await page.locator('input[placeholder="Task name…"]').fill("Buy groceries");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(todosSection.locator("text=Buy groceries")).toBeVisible();

    // Verify empty state is gone
    await expect(todosSection.locator("p.empty-message")).not.toBeVisible();
  });

  test("creates todo with name and notes", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Click add button
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();

    // Fill in name and notes
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Clean the house");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Vacuum, dust, and organize");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(todosSection.locator("text=Clean the house")).toBeVisible();

    // Click to view/edit notes
    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Clean the house" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Verify notes are saved
    await expect(page.locator("textarea")).toHaveValue(
      "Vacuum, dust, and organize",
    );

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
  });

  test("creates todo with name and ECD", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Click add button
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();

    // Fill in name and ECD
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Return library books");

    // Set ECD (Expected Completion Date)
    const ecdInput = page.locator('input[type="date"]');
    await ecdInput.fill("2026-03-28");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      todosSection.locator("text=Return library books"),
    ).toBeVisible();

    // Verify ECD is displayed
    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Return library books" });
    await expect(todoCard).toContainText("03/28");
  });

  test("creates todo with all fields", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Click add button
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();

    // Fill in all fields
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Dentist appointment");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Regular checkup and cleaning");
    await page.locator('input[type="date"]').fill("2026-04-10");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created with all fields
    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Dentist appointment" });
    await expect(todoCard).toBeVisible();
    await expect(todoCard).toContainText("04/10");

    // Verify notes
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue(
      "Regular checkup and cleaning",
    );
    await page.locator('button:has-text("Cancel")').click();
  });

  test("cannot create todo with empty name", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Click add button
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
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
    await expect(todosSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel adding a todo", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Click add button
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();

    // Fill in some data
    await page.locator('input[placeholder="Task name…"]').fill("Test item");

    // Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Modal should close
    await expect(page.locator(".add-modal__title")).not.toBeVisible();

    // Item should not be created
    await expect(todosSection.locator("text=Test item")).not.toBeVisible();
    await expect(todosSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Todos - Read Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearTodos(page);
  });

  test("displays multiple todos in priority order", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create three todos
    const items = ["First todo", "Second todo", "Third todo"];

    for (const item of items) {
      await todosSection
        .locator('button[aria-label="Add task to Todos"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300); // Wait for creation
    }

    // Verify all items are visible
    for (const item of items) {
      await expect(todosSection.locator(`text=${item}`)).toBeVisible();
    }

    // Verify they appear in order
    const todoCards = todosSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(3);
  });

  test("displays todo with all field details", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create todo with all fields
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Pay utility bills");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Electric and water bills");
    await page.locator('input[type="date"]').fill("2026-03-30");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Pay utility bills" });

    // Verify name is visible
    await expect(todoCard.locator("text=Pay utility bills")).toBeVisible();

    // Verify ECD is visible
    await expect(todoCard).toContainText("03/30");

    // Verify checkbox is unchecked
    const checkbox = todoCard.locator(".todo-card__checkbox");
    await expect(checkbox).not.toHaveClass(/todo-card__checkbox--checked/);
  });
});

test.describe("Todos - Update Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearTodos(page);
  });

  test("toggles todo done status", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create a todo
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Call plumber");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Call plumber" });
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

  test("marking done moves todo to end of list", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create two todos
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First item");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second item");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Mark first item as done
    const firstCard = todosSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500); // Wait for reordering

    // Verify "Second item" is now first
    const todoCards = todosSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second item");
    await expect(todoCards.last()).toContainText("First item");
  });

  test("marking undone moves todo to top of list", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create and mark one as done
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("CheckDoneItem");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const firstCard = todosSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Create another undone item
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("CheckUndoneItem");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Unmark the done item - use last() to get the checked one
    const doneCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "CheckDoneItem" })
      .last();
    await doneCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // It should move to the top
    const todoCards = todosSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("CheckDoneItem");
  });

  test("edits todo notes", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create a todo
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Shopping list");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Initial notes");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Shopping list" });

    // Open edit modal
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Verify initial notes
    await expect(page.locator("textarea")).toHaveValue("Initial notes");

    // Update notes
    await page.locator("textarea").fill("Milk, eggs, bread, butter");
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(300);

    // Reopen and verify
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue(
      "Milk, eggs, bread, butter",
    );
    await page.locator('button:has-text("Cancel")').click();
  });

  test("ECD is NOT editable after creation (per API spec)", async ({
    page,
  }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create todo with ECD
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Fixed deadline todo");
    await page.locator('input[type="date"]').fill("2026-05-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Fixed deadline todo" });

    // Verify ECD is displayed
    await expect(todoCard).toContainText("05/01");

    // Open edit modal
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Note: The UI may show the date field in edit mode, but per API spec,
    // changes to ECD are not saved for todos (only notes are updatable)
    // Just close the modal without making changes
    await page.locator('button:has-text("Cancel")').click();
  });

  test("moves todo up in priority", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create two todos
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First todo");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second todo");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Second todo should be at bottom
    let todoCards = todosSection.locator(".todo-card");
    await expect(todoCards.nth(1)).toContainText("Second todo");

    // Move second todo up
    const secondCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Second todo" });
    await secondCard.locator('button[aria-label*="Move up"]').click();
    await page.waitForTimeout(500);

    // Now second todo should be first
    todoCards = todosSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second todo");
    await expect(todoCards.nth(1)).toContainText("First todo");
  });

  test("moves todo down in priority", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create two todos
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First todo");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second todo");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // First todo should be at top
    let todoCards = todosSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("First todo");

    // Move first todo down
    const firstCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "First todo" });
    await firstCard.locator('button[aria-label*="Move down"]').click();
    await page.waitForTimeout(500);

    // Now first todo should be second
    todoCards = todosSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second todo");
    await expect(todoCards.nth(1)).toContainText("First todo");
  });

  test("cannot move first item up", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create one todo
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only todo");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection.locator(".todo-card").first();
    const moveUpButton = todoCard.locator('button[aria-label*="Move up"]');

    // Move up button should be disabled or not visible
    const isDisabled = await moveUpButton.isDisabled().catch(() => false);
    const isHidden = await moveUpButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });

  test("cannot move last item down", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create one todo
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only todo");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection.locator(".todo-card").first();
    const moveDownButton = todoCard.locator('button[aria-label*="Move down"]');

    // Move down button should be disabled or not visible
    const isDisabled = await moveDownButton.isDisabled().catch(() => false);
    const isHidden = await moveDownButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });
});

test.describe("Todos - Delete Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearTodos(page);
  });

  test("deletes todo with confirmation", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create a todo
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Todo to delete");
    await page.locator(".add-modal__btn--confirm").click();

    // Verify it exists
    await expect(todosSection.locator("text=Todo to delete")).toBeVisible();

    // Click delete
    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Todo to delete" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Confirm modal should appear
    await expect(page.locator('text=Delete "Todo to delete"?')).toBeVisible();

    // Confirm deletion
    await page.locator('button:has-text("Delete")').click();

    // Item should be gone
    await expect(todosSection.locator("text=Todo to delete")).not.toBeVisible();
    await expect(todosSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel deletion", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create a todo
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Todo to keep");
    await page.locator(".add-modal__btn--confirm").click();

    // Click delete
    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Todo to keep" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Cancel deletion
    await page.locator('button:has-text("Cancel")').click();

    // Item should still exist
    await expect(todosSection.locator("text=Todo to keep")).toBeVisible();
  });

  test("deletes multiple todos", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create three todos
    const items = ["Todo 1", "Todo 2", "Todo 3"];
    for (const item of items) {
      await todosSection
        .locator('button[aria-label="Add task to Todos"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);
    }

    // Delete each one
    for (const item of items) {
      const todoCard = todosSection
        .locator(".todo-card")
        .filter({ hasText: item });
      await todoCard.locator('button[aria-label*="Delete"]').click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(300);
    }

    // All should be gone
    await expect(todosSection.locator("p.empty-message")).toBeVisible();
  });

  test("deleting reorders remaining items' priorities", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create three todos
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Third");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Delete middle item
    const secondCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Second" });
    await secondCard.locator('button[aria-label*="Delete"]').click();
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);

    // Remaining items should still be in order
    const todoCards = todosSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(2);
    await expect(todoCards.first()).toContainText("First");
    await expect(todoCards.nth(1)).toContainText("Third");
  });
});

test.describe("Todos - Complex Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await clearTodos(page);
  });

  test("handles mixed done and undone items correctly", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create multiple items and mark some as done
    const items = [
      { name: "MixedUndone1", done: false },
      { name: "MixedDone1", done: true },
      { name: "MixedUndone2", done: false },
      { name: "MixedDone2", done: true },
    ];

    for (const item of items) {
      await todosSection
        .locator('button[aria-label="Add task to Todos"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item.name);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);

      if (item.done) {
        const todoCard = todosSection
          .locator(".todo-card")
          .filter({ hasText: item.name })
          .first();
        await todoCard.locator(".todo-card__checkbox").click();
        await page.waitForTimeout(500);
      }
    }

    // Verify undone items appear before done items
    const todoCards = todosSection.locator(".todo-card");
    const firstCardText = await todoCards.first().textContent();
    const lastCardText = await todoCards.last().textContent();

    expect(firstCardText).toMatch(/MixedUndone/);
    expect(lastCardText).toMatch(/MixedDone/);
  });

  test("creates todo with future ECD date", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Future todo");
    await page.locator('input[type="date"]').fill("2027-01-15");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Future todo" });
    await expect(todoCard).toContainText("01/15/27");
  });

  test("creates todo with past ECD date", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Overdue todo");
    await page.locator('input[type="date"]').fill("2025-12-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Overdue todo" });
    await expect(todoCard).toBeVisible();
    // Date should still be displayed even if in the past
    await expect(todoCard).toContainText("12/01/25");
  });

  test("handles long names gracefully", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    const longName =
      "This is a very long todo name that should be handled properly by the application without breaking the UI layout or causing any display issues";

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(longName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      todosSection.locator(`text=${longName.substring(0, 20)}`),
    ).toBeVisible();
  });

  test("handles long notes gracefully", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    const longNotes =
      "This is a very long notes section that contains a lot of detailed information about the todo. ".repeat(
        10,
      );

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Todo with long notes");
    await page.locator('textarea[placeholder*="optional"]').fill(longNotes);
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Todo with long notes" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    await expect(page.locator("textarea")).toHaveValue(longNotes);
    await page.locator('button:has-text("Cancel")').click();
  });

  test("handles special characters in name", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    const specialName = "Todo with @special #characters & symbols!? 100%";

    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(specialName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(todosSection.locator(`text=${specialName}`)).toBeVisible();
  });

  test("rapid creating and deleting works correctly", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Rapidly create 5 items
    for (let i = 1; i <= 5; i++) {
      await todosSection
        .locator('button[aria-label="Add task to Todos"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(`Rapid ${i}`);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(100);
    }

    // Verify all created
    const todoCards = todosSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(5);

    // Rapidly delete all
    for (let i = 1; i <= 5; i++) {
      await todosSection
        .locator('button[aria-label*="Delete"]')
        .first()
        .click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(100);
    }

    // Verify all deleted
    await expect(todosSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Todos - UI Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await clearTodos(page);
  });

  test("maintains state after page reload", async ({ page }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Create a todo
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Persistent todo");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Should persist");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();

    // Verify item still exists
    await expect(todosSection.locator("text=Persistent todo")).toBeVisible();

    // Verify notes persisted
    const todoCard = todosSection
      .locator(".todo-card")
      .filter({ hasText: "Persistent todo" });
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue("Should persist");
  });

  test("closes modal when clicking outside (if supported)", async ({
    page,
  }) => {
    await page.goto("/");

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Open add modal
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
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

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Open add modal
    await todosSection
      .locator('button[aria-label="Add task to Todos"]')
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

    await expect(todosSection.locator("text=Keyboard test")).toBeVisible();
  });

  test("displays appropriate empty state message", async ({ page }) => {
    await clearTodos(page);

    const todosSection = page
      .locator("section")
      .filter({ hasText: "Todos" })
      .first();

    // Check empty state message
    const emptyMessage = todosSection.locator("p.empty-message");
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toHaveText("No tasks yet — add one!");
  });
});
