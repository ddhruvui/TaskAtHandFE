/**
 * E2E tests for the Insights view (habit stats, task stats, AI coach).
 *
 * The insights endpoints read from the TaskArchive, which is written by the
 * nightly cron and cannot be seeded through the public API. These tests mock
 * the /insights responses at the network layer so every state is
 * deterministic.
 */

import { test, expect, type Page } from "@playwright/test";
import { cleanDatabase, waitForPageLoad } from "./helpers";

const emptyStats = {
  periodDays: 28,
  eventCount: 0,
  habits: [],
  recurringTasks: [],
  oneTimeTasks: { completedCount: 0, avgSlippageDays: null, recent: [] },
  reschedules: [],
  byHeader: {},
};

const richStats = {
  periodDays: 28,
  eventCount: 42,
  habits: [
    {
      taskName: "Morning run",
      headerName: "Health",
      scheduledDays: ["Mon", "Wed"],
      scheduled: 8,
      completed: 6,
      completionRate: 75,
      currentStreak: 2,
      longestStreak: 4,
      missedByDow: { Mon: 1, Wed: 1 },
      recentResults: [
        { dueDate: "2026-07-06", completed: true },
        { dueDate: "2026-07-08", completed: false },
      ],
    },
  ],
  recurringTasks: [],
  oneTimeTasks: { completedCount: 5, avgSlippageDays: 1.5, recent: [] },
  reschedules: [
    { taskName: "File taxes", headerName: "Admin", total: 3, pushedLater: 2 },
  ],
  byHeader: {},
};

const sampleInsight = {
  _id: "insight1",
  generatedAt: "2026-07-10T08:00:00.000Z",
  periodDays: 28,
  model: "claude-opus-4-8",
  report: {
    summary: "You are mostly on track this month.",
    habitsOnTrack: ["Morning run is at 75%"],
    habitsSlipping: ["Evening reading has stalled"],
    taskInsights: ["One-time tasks slip by about 1.5 days"],
    procrastinationFlags: ["File taxes has moved 3 times"],
    suggestions: ["Block a weekend morning for taxes"],
  },
};

async function mockInsights(
  page: Page,
  opts: {
    stats?: object;
    statsError?: string;
    latest?: object | null;
  },
) {
  await page.route("**/insights/stats*", (route) =>
    opts.statsError
      ? route.fulfill({ status: 500, json: { error: opts.statsError } })
      : route.fulfill({ json: opts.stats ?? emptyStats }),
  );
  await page.route("**/insights/latest", (route) =>
    opts.latest
      ? route.fulfill({ json: opts.latest })
      : route.fulfill({ status: 404, json: { error: "No insight reports yet" } }),
  );
}

async function openInsightsView(page: Page) {
  await page.locator(".insights-toggle-btn").click();
  await expect(page.getByText("Loading insights…")).not.toBeVisible();
  await expect(page.locator(".insights-panel")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await page.goto("/");
  await waitForPageLoad(page);
});

test.describe("Insights - Panel", () => {
  test("should show the insights sections when toggled", async ({ page }) => {
    await mockInsights(page, { stats: emptyStats, latest: null });
    await openInsightsView(page);

    await expect(page.getByRole("heading", { name: "Habits" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coach" })).toBeVisible();

    const btn = page.locator(".insights-toggle-btn");
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(btn).toHaveClass(/insights-toggle-btn--active/);
  });

  test("should return to the todo view when toggled off", async ({ page }) => {
    await mockInsights(page, { stats: emptyStats, latest: null });
    await openInsightsView(page);

    await page.locator(".insights-toggle-btn").click();

    await expect(page.locator(".insights-panel")).not.toBeVisible();
    await expect(page.getByText("No headers yet — add one!")).toBeVisible();
  });

  test("should take precedence over the events view", async ({ page }) => {
    await mockInsights(page, { stats: emptyStats, latest: null });

    await page.locator(".events-toggle-btn").click();
    await expect(page.locator(".events-panel")).toBeVisible();

    await openInsightsView(page);
    await expect(page.locator(".events-panel")).not.toBeVisible();
  });

  test("should show an error when the stats endpoint fails", async ({
    page,
  }) => {
    await mockInsights(page, { statsError: "boom", latest: null });
    await openInsightsView(page);

    await expect(page.getByText("Insights error: boom")).toBeVisible();
  });
});

test.describe("Insights - Empty states", () => {
  test("should show empty states when there is no archive data", async ({
    page,
  }) => {
    await mockInsights(page, { stats: emptyStats, latest: null });
    await openInsightsView(page);

    await expect(page.getByText("No habit history yet.")).toBeVisible();
    await expect(
      page.getByText("No task history yet — completed tasks are archived"),
    ).toBeVisible();
    await expect(page.getByText("No AI report yet")).toBeVisible();
  });

  test("should disable Generate now when there is no archive data", async ({
    page,
  }) => {
    await mockInsights(page, { stats: emptyStats, latest: null });
    await openInsightsView(page);

    const generateBtn = page.getByRole("button", { name: "Generate now" });
    await expect(generateBtn).toBeDisabled();
    await expect(generateBtn).toHaveAttribute(
      "title",
      "No archive data to analyze yet",
    );
  });
});

test.describe("Insights - Stats display", () => {
  test("should render habit cards from stats", async ({ page }) => {
    await mockInsights(page, { stats: richStats, latest: null });
    await openInsightsView(page);

    const card = page.locator(".insights-habit-card", {
      hasText: "Morning run",
    });
    await expect(card).toBeVisible();
    await expect(card.getByText("Health")).toBeVisible();
    await expect(card.getByText("75%")).toBeVisible();
    await expect(card.getByText("6/8 · streak 2 (best 4)")).toBeVisible();
    await expect(card.locator(".insights-dot")).toHaveCount(2);
    await expect(card.locator(".insights-dot--hit")).toHaveCount(1);
    await expect(card.locator(".insights-dot--miss")).toHaveCount(1);
  });

  test("should render task stats and the most rescheduled list", async ({
    page,
  }) => {
    await mockInsights(page, { stats: richStats, latest: null });
    await openInsightsView(page);

    const taskStats = page.locator(".insights-task-stats");
    await expect(taskStats).toContainText(
      "5 one-time tasks completed in the last 28 days",
    );
    await expect(taskStats).toContainText(
      "average slip of 1.5 days past the planned date",
    );
    await expect(taskStats).toContainText("Most rescheduled:");
    await expect(taskStats).toContainText(
      "File taxes — moved 3× (2× pushed later)",
    );
  });
});

test.describe("Insights - Coach report", () => {
  test("should render the latest AI report", async ({ page }) => {
    await mockInsights(page, { stats: richStats, latest: sampleInsight });
    await openInsightsView(page);

    await expect(
      page.getByText("You are mostly on track this month."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "On track" }),
    ).toBeVisible();
    await expect(page.getByText("Morning run is at 75%")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Slipping" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Procrastination flags" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Suggestions" }),
    ).toBeVisible();
    await expect(
      page.getByText("Block a weekend morning for taxes"),
    ).toBeVisible();
  });

  test("should generate a fresh report on demand", async ({ page }) => {
    await mockInsights(page, { stats: richStats, latest: null });
    await page.route("**/insights/generate", (route) =>
      route.fulfill({ json: sampleInsight }),
    );
    await openInsightsView(page);

    await expect(page.getByText("No AI report yet")).toBeVisible();

    const generateBtn = page.getByRole("button", { name: "Generate now" });
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    await expect(
      page.getByText("You are mostly on track this month."),
    ).toBeVisible();
    await expect(page.getByText("No AI report yet")).not.toBeVisible();
  });
});
