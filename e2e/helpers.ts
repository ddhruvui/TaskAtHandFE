/**
 * Test helpers and utilities for Playwright tests
 */

import { expect, type Page } from "@playwright/test";
import type { ECD } from "../src/types";

const API_BASE = "http://localhost:3002";

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
 * Delete a task via UI
 */
export async function deleteTaskViaUI(page: Page, taskName: string) {
  const task = page.locator(".task-card", { hasText: taskName });
  await task.getByTitle("Delete").click();
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
