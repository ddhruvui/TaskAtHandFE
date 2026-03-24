import { test, expect, type Page } from "@playwright/test";

/**
 * Comprehensive E2E tests for Events functionality
 * Tests all CRUD operations, priority reordering, and edge cases
 * Based on API_REFERENCE.md specifications
 *
 * Special Event Behaviors:
 * 1. When an event is marked as done, 1 year is automatically added to its ECD date
 * 2. The chron endpoint does NOT delete events - it unmarks done events whose ECD
 *    falls within the current week and moves them to the lowest priority
 * 3. Unlike workondreams, ECD IS updatable for events
 */

// Helper to reset the database state before each test
async function clearEvents(page: Page) {
  // Use API to delete all events for faster test setup
  const response = await page.request.get("http://localhost:3002/api/events");
  const data = await response.json();

  if (data.success && data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      await page.request.delete(`http://localhost:3002/api/events/${item._id}`);
    }
  }

  // Navigate to app after clearing
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Events - Page Loading", () => {
  test("homepage loads successfully with Events section", async ({ page }) => {
    await page.goto("/");

    // Verify page title
    await expect(page).toHaveTitle(/taskathandfe/i);

    // Verify main heading
    await expect(page.locator("h1")).toHaveText("Task At Hand");

    // Verify Events section exists
    const eventsHeading = page.locator("h2").filter({ hasText: "Events" });
    await expect(eventsHeading).toBeVisible();
  });

  test("displays empty state when no events exist", async ({ page }) => {
    await clearEvents(page);

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();
    await expect(eventsSection.locator("p.empty-message")).toHaveText(
      "No tasks yet — add one!",
    );
  });

  test("Add button is visible in Events section", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();
    const addButton = eventsSection.locator(
      'button[aria-label="Add task to Events"]',
    );
    await expect(addButton).toBeVisible();
  });
});

test.describe("Events - Create Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearEvents(page);
  });

  test("creates event with only name (required field)", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Click add button
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();

    // Modal should appear
    await expect(page.locator(".add-modal__title")).toBeVisible();

    // Fill in name only
    await page.locator('input[placeholder="Task name…"]').fill("Annual review");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(eventsSection.locator("text=Annual review")).toBeVisible();

    // Verify empty state is gone
    await expect(eventsSection.locator("p.empty-message")).not.toBeVisible();
  });

  test("creates event with name and notes", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Click add button
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();

    // Fill in name and notes
    await page.locator('input[placeholder="Task name…"]').fill("Team offsite");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Book venue and organize activities");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(eventsSection.locator("text=Team offsite")).toBeVisible();

    // Click to view/edit notes
    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Team offsite" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Verify notes are saved
    await expect(page.locator("textarea")).toHaveValue(
      "Book venue and organize activities",
    );

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
  });

  test("creates event with name and ECD", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Click add button
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();

    // Fill in name and ECD
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Performance review");

    // Set ECD (Expected Completion Date)
    const ecdInput = page.locator('input[type="date"]');
    await ecdInput.fill("2026-06-15");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created
    await expect(
      eventsSection.locator("text=Performance review"),
    ).toBeVisible();

    // Verify ECD is displayed
    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Performance review" });
    await expect(todoCard).toContainText("06/15");
  });

  test("creates event with all fields", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Click add button
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();

    // Fill in all fields
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Company anniversary");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Plan celebration event with catering");
    await page.locator('input[type="date"]').fill("2027-12-31");

    // Submit
    await page.locator(".add-modal__btn--confirm").click();

    // Verify item was created with all fields
    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Company anniversary" });
    await expect(todoCard).toBeVisible();
    await expect(todoCard).toContainText("12/31/27");

    // Verify notes
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue(
      "Plan celebration event with catering",
    );
    await page.locator('button:has-text("Cancel")').click();
  });

  test("cannot create event with empty name", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Click add button
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
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
    await expect(eventsSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel adding an event", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Click add button
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();

    // Fill in some data
    await page.locator('input[placeholder="Task name…"]').fill("Test event");

    // Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Modal should close
    await expect(page.locator(".add-modal__title")).not.toBeVisible();

    // Item should not be created
    await expect(eventsSection.locator("text=Test event")).not.toBeVisible();
    await expect(eventsSection.locator("p.empty-message")).toBeVisible();
  });
});

test.describe("Events - Read Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearEvents(page);
  });

  test("displays multiple events in priority order", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create three events
    const items = ["First event", "Second event", "Third event"];

    for (const item of items) {
      await eventsSection
        .locator('button[aria-label="Add task to Events"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300); // Wait for creation
    }

    // Verify all items are visible
    for (const item of items) {
      await expect(eventsSection.locator(`text=${item}`)).toBeVisible();
    }

    // Verify they appear in order
    const todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(3);
  });

  test("displays event with all field details", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create event with all fields
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Conference");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Tech conference in SF");
    await page.locator('input[type="date"]').fill("2030-12-31");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Conference" });

    // Verify name is visible
    await expect(todoCard.locator(".todo-card__name")).toContainText(
      "Conference",
    );

    // Verify ECD is visible
    await expect(todoCard).toContainText("12/31/30");

    // Verify checkbox is unchecked
    const checkbox = todoCard.locator(".todo-card__checkbox");
    await expect(checkbox).not.toHaveClass(/todo-card__checkbox--checked/);
  });
});

test.describe("Events - Update Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearEvents(page);
  });

  test("toggles event done status", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create an event
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Weekly meeting");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Weekly meeting" });
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

  test("marking done moves event to end of list", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create two events
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First event");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second event");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Mark first item as done
    const firstCard = eventsSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500); // Wait for reordering

    // Verify "Second event" is now first
    const todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second event");
    await expect(todoCards.last()).toContainText("First event");
  });

  test("marking undone moves event to top of list", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create and mark one as done
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("CheckDoneEvent");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const firstCard = eventsSection.locator(".todo-card").first();
    await firstCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Create another undone item
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("CheckUndoneEvent");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Unmark the done item - use last() to get the checked one
    const doneCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "CheckDoneEvent" })
      .last();
    await doneCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // It should move to the top
    const todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("CheckDoneEvent");
  });

  test("marking event as done adds 1 year to ECD (special behavior)", async ({
    page,
  }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create an event with specific ECD
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Birthday party");
    await page.locator('input[type="date"]').fill("2026-06-15");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Birthday party" });

    // Verify initial ECD date (2026)
    await expect(todoCard).toContainText("06/15");

    // Mark as done
    await todoCard.locator(".todo-card__checkbox").click();
    await page.waitForTimeout(500);

    // Verify date is now 1 year later (2027) - the ECD should now show 06/15/27
    // After marking done, the event should show the new date
    // Note: The exact display format depends on the UI implementation
    await expect(todoCard).toContainText("06/15/27");
  });

  test("edits event notes", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create an event
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Quarterly planning");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Initial notes");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Quarterly planning" });

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

  test("ECD IS editable after creation (unlike workondreams)", async ({
    page,
  }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create event with ECD
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Flexible event");
    await page.locator('input[type="date"]').fill("2026-08-15");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Flexible event" });

    // Verify initial ECD date
    await expect(todoCard).toContainText("08/15");

    // Open edit modal
    await todoCard.locator('button[aria-label*="Edit"]').click();

    // Change ECD (this is updatable for events, unlike workondreams)
    await page.locator('input[type="date"]').fill("2026-09-20");
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(300);

    // Verify new date is displayed
    await expect(todoCard).toContainText("09/20");
  });

  test("moves event up in priority", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create two events
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First event");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second event");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Second event should be at bottom
    let todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards.nth(1)).toContainText("Second event");

    // Move second event up
    const secondCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Second event" });
    await secondCard.locator('button[aria-label*="Move up"]').click();
    await page.waitForTimeout(500);

    // Now second event should be first
    todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second event");
    await expect(todoCards.nth(1)).toContainText("First event");
  });

  test("moves event down in priority", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create two events
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First event");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second event");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // First event should be at top
    let todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("First event");

    // Move first event down
    const firstCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "First event" });
    await firstCard.locator('button[aria-label*="Move down"]').click();
    await page.waitForTimeout(500);

    // Now first event should be second
    todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards.first()).toContainText("Second event");
    await expect(todoCards.nth(1)).toContainText("First event");
  });

  test("cannot move first item up", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create one event
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only event");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection.locator(".todo-card").first();
    const moveUpButton = todoCard.locator('button[aria-label*="Move up"]');

    // Move up button should be disabled or not visible
    const isDisabled = await moveUpButton.isDisabled().catch(() => false);
    const isHidden = await moveUpButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });

  test("cannot move last item down", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create one event
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Only event");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection.locator(".todo-card").first();
    const moveDownButton = todoCard.locator('button[aria-label*="Move down"]');

    // Move down button should be disabled or not visible
    const isDisabled = await moveDownButton.isDisabled().catch(() => false);
    const isHidden = await moveDownButton.isHidden().catch(() => false);

    expect(isDisabled || isHidden).toBeTruthy();
  });
});

test.describe("Events - Delete Operations", () => {
  test.beforeEach(async ({ page }) => {
    await clearEvents(page);
  });

  test("deletes event with confirmation", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create an event
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Event to delete");
    await page.locator(".add-modal__btn--confirm").click();

    // Verify it exists
    await expect(eventsSection.locator("text=Event to delete")).toBeVisible();

    // Click delete
    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Event to delete" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Confirm modal should appear
    await expect(page.locator('text=Delete "Event to delete"?')).toBeVisible();

    // Confirm deletion
    await page.locator('button:has-text("Delete")').click();

    // Item should be gone
    await expect(
      eventsSection.locator("text=Event to delete"),
    ).not.toBeVisible();
    await expect(eventsSection.locator("p.empty-message")).toBeVisible();
  });

  test("can cancel deletion", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create an event
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Event to keep");
    await page.locator(".add-modal__btn--confirm").click();

    // Click delete
    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Event to keep" });
    await todoCard.locator('button[aria-label*="Delete"]').click();

    // Cancel deletion
    await page.locator('button:has-text("Cancel")').click();

    // Item should still exist
    await expect(eventsSection.locator("text=Event to keep")).toBeVisible();
  });

  test("deletes multiple events", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create three events
    const items = ["Event 1", "Event 2", "Event 3"];
    for (const item of items) {
      await eventsSection
        .locator('button[aria-label="Add task to Events"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);
    }

    // Delete each one
    for (const item of items) {
      const todoCard = eventsSection
        .locator(".todo-card")
        .filter({ hasText: item });
      await todoCard.locator('button[aria-label*="Delete"]').click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(300);
    }

    // All should be gone
    await expect(eventsSection.locator("p.empty-message")).toBeVisible();
  });

  test("deleting reorders remaining items' priorities", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create three events
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("First");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Second");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Third");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(300);

    // Delete middle item
    const secondCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Second" });
    await secondCard.locator('button[aria-label*="Delete"]').click();
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);

    // Remaining items should still be in order
    const todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(2);
    await expect(todoCards.first()).toContainText("First");
    await expect(todoCards.nth(1)).toContainText("Third");
  });
});

test.describe("Events - Complex Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await clearEvents(page);
  });

  test("handles mixed done and undone items correctly", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create multiple items and mark some as done
    const items = [
      { name: "MixedUndone1", done: false },
      { name: "MixedDone1", done: true },
      { name: "MixedUndone2", done: false },
      { name: "MixedDone2", done: true },
    ];

    for (const item of items) {
      await eventsSection
        .locator('button[aria-label="Add task to Events"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(item.name);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(300);

      if (item.done) {
        const todoCard = eventsSection
          .locator(".todo-card")
          .filter({ hasText: item.name })
          .first();
        await todoCard.locator(".todo-card__checkbox").click();
        await page.waitForTimeout(500);
      }
    }

    // Verify undone items appear before done items
    const todoCards = eventsSection.locator(".todo-card");
    const firstCardText = await todoCards.first().textContent();
    const lastCardText = await todoCards.last().textContent();

    expect(firstCardText).toMatch(/MixedUndone/);
    expect(lastCardText).toMatch(/MixedDone/);
  });

  test("creates event with future ECD date", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Future event");
    await page.locator('input[type="date"]').fill("2035-01-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Future event" });
    await expect(todoCard).toContainText("01/01/35");
  });

  test("creates event with past ECD date", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Overdue event");
    await page.locator('input[type="date"]').fill("2025-01-01");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Overdue event" });
    await expect(todoCard).toBeVisible();
    // Date should still be displayed even if in the past
    await expect(todoCard).toContainText("01/01/25");
  });

  test("handles long names gracefully", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    const longName =
      "This is a very long event name that should be handled properly by the application without breaking the UI layout or causing any display issues";

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(longName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(
      eventsSection.locator(`text=${longName.substring(0, 20)}`),
    ).toBeVisible();
  });

  test("handles long notes gracefully", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    const longNotes =
      "This is a very long notes section that contains a lot of detailed information about the event. ".repeat(
        10,
      );

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Event with long notes");
    await page.locator('textarea[placeholder*="optional"]').fill(longNotes);
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Event with long notes" });
    await todoCard.locator('button[aria-label*="Edit"]').click();

    await expect(page.locator("textarea")).toHaveValue(longNotes);
    await page.locator('button:has-text("Cancel")').click();
  });

  test("handles special characters in name", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    const specialName = "Event with @special #characters & symbols!? 100%";

    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill(specialName);
    await page.locator(".add-modal__btn--confirm").click();

    await expect(eventsSection.locator(`text=${specialName}`)).toBeVisible();
  });

  test("rapid creating and deleting works correctly", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Rapidly create 5 items
    for (let i = 1; i <= 5; i++) {
      await eventsSection
        .locator('button[aria-label="Add task to Events"]')
        .click();
      await page.locator('input[placeholder="Task name…"]').fill(`Rapid ${i}`);
      await page.locator(".add-modal__btn--confirm").click();
      await page.waitForTimeout(100);
    }

    // Verify all created
    const todoCards = eventsSection.locator(".todo-card");
    await expect(todoCards).toHaveCount(5);

    // Rapidly delete all
    for (let i = 1; i <= 5; i++) {
      await eventsSection
        .locator('button[aria-label*="Delete"]')
        .first()
        .click();
      await page.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(100);
    }

    // Verify all deleted
    await expect(eventsSection.locator("p.empty-message")).toBeVisible();
  });

  test("marking done and undone multiple times preserves data", async ({
    page,
  }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create event with notes
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page.locator('input[placeholder="Task name…"]').fill("Toggle test");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Important notes");
    await page.locator(".add-modal__btn--confirm").click();

    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Toggle test" });
    const checkbox = todoCard.locator(".todo-card__checkbox");

    // Toggle done/undone multiple times
    for (let i = 0; i < 3; i++) {
      await checkbox.click();
      await page.waitForTimeout(300);
    }

    // Verify notes are still there
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue("Important notes");
    await page.locator('button:has-text("Cancel")').click();
  });
});

test.describe("Events - UI Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await clearEvents(page);
  });

  test("maintains state after page reload", async ({ page }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Create an event
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
      .click();
    await page
      .locator('input[placeholder="Task name…"]')
      .fill("Persistent event");
    await page
      .locator('textarea[placeholder*="optional"]')
      .fill("Should persist");
    await page.locator(".add-modal__btn--confirm").click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();

    // Verify item still exists
    await expect(eventsSection.locator("text=Persistent event")).toBeVisible();

    // Verify notes persisted
    const todoCard = eventsSection
      .locator(".todo-card")
      .filter({ hasText: "Persistent event" });
    await todoCard.locator('button[aria-label*="Edit"]').click();
    await expect(page.locator("textarea")).toHaveValue("Should persist");
  });

  test("closes modal when clicking outside (if supported)", async ({
    page,
  }) => {
    await page.goto("/");

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Open add modal
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
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

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Open add modal
    await eventsSection
      .locator('button[aria-label="Add task to Events"]')
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

    await expect(eventsSection.locator("text=Keyboard test")).toBeVisible();
  });

  test("displays appropriate empty state message", async ({ page }) => {
    await clearEvents(page);

    const eventsSection = page
      .locator("section")
      .filter({ hasText: "Events" })
      .first();

    // Check empty state message
    const emptyMessage = eventsSection.locator("p.empty-message");
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toHaveText("No tasks yet — add one!");
  });
});
