/**
 * Test helpers and utilities for Playwright tests
 */

import { expect, type Page } from "@playwright/test";
import type { ECD } from "../src/types";

// Override with E2E_API_BASE_URL to run against a backend on another port
// (e.g. a USE_TEST_DB instance) without touching the default dev backend.
const API_BASE = process.env.E2E_API_BASE_URL || "http://localhost:3002";

/**
 * Clean all headers and tasks from the database
 */
export async function cleanDatabase() {
  const headers = await fetch(`${API_BASE}/headers`).then((r) => r.json());
  for (const header of headers) {
    await fetch(`${API_BASE}/headers/${header._id}`, { method: "DELETE" });
  }
}

/**
 * Create a header via API
 */
export async function createHeader(name: string) {
  const res = await fetch(`${API_BASE}/headers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

/**
 * Create a task via API
 */
export async function createTask(params: {
  name: string;
  headerId: string;
  notes?: string;
  ecd?: ECD | null;
  done?: boolean;
}) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      headerId: params.headerId,
      notes: params.notes || "",
      ecd: params.ecd || null,
    }),
  });
  const task = await res.json();

  // If done is specified, update the task
  if (params.done !== undefined && params.done !== false) {
    const updated = await fetch(`${API_BASE}/tasks/${task._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: params.done }),
    });
    return updated.json();
  }

  return task;
}

/**
 * Fetch raw TaskArchive events, optionally filtered by type (e.g. "task_deleted").
 */
export async function getArchiveEvents(type?: string) {
  const url = type
    ? `${API_BASE}/archive?type=${type}`
    : `${API_BASE}/archive`;
  return fetch(url).then((r) => r.json());
}

/**
 * Clean all events from the database
 */
export async function cleanEvents() {
  const events = await fetch(`${API_BASE}/events`).then((r) => r.json());
  for (const event of events) {
    await fetch(`${API_BASE}/events/${event._id}`, { method: "DELETE" });
  }
}

/**
 * Create an event via API
 */
export async function createEvent(name: string, tasks: string[]) {
  const res = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, tasks }),
  });
  return res.json();
}

/**
 * Clean all goals from the database
 */
export async function cleanGoals() {
  const goals = await fetch(`${API_BASE}/goals`).then((r) => r.json());
  for (const goal of goals) {
    await fetch(`${API_BASE}/goals/${goal._id}`, { method: "DELETE" });
  }
}

/**
 * Create a goal via API
 */
export async function createGoal(
  name: string,
  steps: {
    name: string;
    status?: "pending" | "active" | "under_progress";
  }[] = [],
) {
  const res = await fetch(`${API_BASE}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, steps }),
  });
  return res.json();
}

/**
 * Clean all affirmations from the database
 */
export async function cleanAffirmations() {
  const affirmations = await fetch(`${API_BASE}/affirmations`).then((r) =>
    r.json(),
  );
  for (const affirmation of affirmations) {
    await fetch(`${API_BASE}/affirmations/${affirmation._id}`, {
      method: "DELETE",
    });
  }
}

/**
 * Create an affirmation via API
 */
export async function createAffirmation(name: string) {
  const res = await fetch(`${API_BASE}/affirmations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

/**
 * Clean all calls from the database
 */
export async function cleanCalls() {
  const calls = await fetch(`${API_BASE}/calls`).then((r) => r.json());
  for (const call of calls) {
    await fetch(`${API_BASE}/calls/${call._id}`, { method: "DELETE" });
  }
}

/**
 * Create a call via API
 */
export async function createCall(
  name: string,
  frequency: "biweekly" | "monthly",
) {
  const res = await fetch(`${API_BASE}/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, frequency }),
  });
  return res.json();
}

/**
 * Local date key (YYYY-MM-DD) offset from today by the given number of days
 */
export function dateKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * First day of the month `offsetMonths` after the current month
 */
export function monthAt(offsetMonths: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
}

/**
 * EcdCalendar heading ("July 2026") for the month `offsetMonths` from now
 */
export function calendarMonthLabel(offsetMonths: number): string {
  const d = monthAt(offsetMonths);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * TaskCard label for a date ECD on the given day of the month
 * `offsetMonths` from now: "[ MM/DD ]", plus "/YY" when not the current year
 */
export function dateEcdLabel(offsetMonths: number, day: number): string {
  const d = monthAt(offsetMonths);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const yearSuffix =
    d.getFullYear() === new Date().getFullYear()
      ? ""
      : `/${String(d.getFullYear()).slice(-2)}`;
  return `[ ${mm}/${dd}${yearSuffix} ]`;
}

/**
 * TaskCard label for a day_of_year ECD ("↻ D/M/YYYY") on the given day of
 * the month `offsetMonths` from now
 */
export function yearlyEcdLabel(offsetMonths: number, day: number): string {
  const d = monthAt(offsetMonths);
  return `↻ ${day}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Get all headers from API
 */
export async function getHeaders() {
  const res = await fetch(`${API_BASE}/headers`);
  return res.json();
}

/**
 * Get all tasks for a header from API
 */
export async function getTasks(headerId: string) {
  const res = await fetch(`${API_BASE}/tasks?headerId=${headerId}`);
  return res.json();
}

/**
 * Wait for the page to load and show no loading state
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForSelector("h1:has-text('Task At Hand')");
  await expect(page.getByText("Loading…")).not.toBeVisible();
}

/**
 * Add a header via UI
 */
export async function addHeaderViaUI(page: Page, name: string) {
  await page.getByRole("button", { name: "Add header" }).click();
  await page.getByPlaceholder("Header name…").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  // Wait for the header to appear
  await page.locator(".readme-section", { hasText: name }).waitFor();
}

/**
 * Add a task via UI with minimal info (name only)
 */
export async function addTaskViaUI(
  page: Page,
  headerName: string,
  taskName: string,
) {
  // Find the header section
  const header = page.locator(".readme-section", { hasText: headerName });
  await header.getByTitle("Add task").click();

  // Fill task name
  await page.getByPlaceholder("Task name…").fill(taskName);
  await page.getByRole("button", { name: "Add task", exact: true }).click();
}

/**
 * Delete a header via UI
 */
export async function deleteHeaderViaUI(page: Page, headerName: string) {
  const header = page.locator(".readme-section", { hasText: headerName });
  await header.getByTitle("Delete header").click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  // Wait for the header to disappear
  await page
    .locator(".readme-section", { hasText: headerName })
    .waitFor({ state: "detached" });
}

/**
 * Delete a task via UI. Undone tasks require a deletion reason (the confirm
 * modal shows a required textarea), so fill it whenever the field is present.
 */
export async function deleteTaskViaUI(
  page: Page,
  taskName: string,
  reason = "e2e cleanup",
) {
  const task = page.locator(".task-card", { hasText: taskName });
  await task.getByTitle("Delete").click();
  await page.locator(".confirm-modal").waitFor({ state: "visible" });
  const reasonInput = page.locator(".confirm-modal__reason-input");
  if (await reasonInput.count()) {
    await reasonInput.fill(reason);
  }
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  // Wait for the task to be removed from the DOM
  await task.waitFor({ state: "detached" });
}

/**
 * Toggle task done/undone
 */
export async function toggleTaskDone(page: Page, taskName: string) {
  const task = page.locator(".task-card", { hasText: taskName });
  await task.locator(".task-card__checkbox").click();
}

/**
 * Get task element
 */
export function getTask(page: Page, taskName: string) {
  return page.locator(".task-card", { hasText: taskName });
}

/**
 * Check if task is marked as done
 */
export async function isTaskDone(page: Page, taskName: string) {
  const task = getTask(page, taskName);
  return (
    (await task.getAttribute("class"))?.includes("task-card--done") || false
  );
}

/**
 * Get all task names in a header
 */
export async function getTaskNamesInHeader(page: Page, headerName: string) {
  const header = page.locator(".readme-section", { hasText: headerName });
  const tasks = header.locator(".task-card__name");
  return tasks.allTextContents();
}

/**
 * Get all header names
 */
export async function getHeaderNames(page: Page) {
  const headers = page.locator(".readme-heading__text");
  return headers.allTextContents();
}
