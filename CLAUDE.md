# TaskAtHandFE

React 19 + TypeScript + Vite web client for the TaskAtHandBE API. Plain hooks (no state library) — `src/App.tsx` owns all state and orchestrates everything; components communicate via prop callbacks only, no context.

## Commands

- `npm run dev` — Vite on http://localhost:5173
- `npm test` — Vitest unit tests (watch mode; jsdom)
- `npm run test:e2e` — Playwright e2e. **Prerequisite: backend running on port 3002.** Playwright auto-starts the Vite server, but NOT the backend.
- `npm run build` — `tsc -b && vite build` (strict TS; build fails on type errors)
- `npm run lint` — ESLint
- Also available: `test:coverage`, `test:ui` (Vitest UI), `test:list` (Playwright list reporter, 1 worker), `test:e2e:ui`, `test:e2e:report`

Config: `VITE_API_BASE_URL` in `.env` (template in `.env.example`), read at import time in `src/api/client.ts`. Note: the e2e helpers do NOT use it — `e2e/helpers.ts` hardcodes its own `API_BASE = "http://localhost:3002"`, so changing `.env` alone won't repoint e2e setup/cleanup.

## Architecture rules

- **Data flow**: `loadAll()` in App.tsx fetches all headers then each header's tasks; **no optimistic updates** — every mutation calls the API then refetches (`reloadHeaderTasks(headerId)` or full reload). Keep this pattern.
- **API layer** (`src/api/`): everything goes through `apiFetch<T>` in `client.ts` (JSON headers, throws `Error` from `{ error }` body or `!res.ok`). One module per resource (headers, tasks, events, insights), re-exported from `index.ts`.
- **Component pattern**: folder-per-component under `src/components/` with `Component.tsx`, `Component.css`, `index.ts` (and optional `Component.types.ts`). Plain CSS, BEM classes (`task-card__ecd--recurring`), CSS variables + dark mode in `src/index.css`.
- **Modals**: overlay div closes on click (stopPropagation inside), focus via ref on open, `onConfirm(draft)`/`onCancel` callbacks. Match existing modals when adding one.
- **Types** live in `src/types.ts` (Header, Task, EventTemplate, Insight, the four ECD variants) and are partially mirrored in `src/api/tasks.ts` — keep both in sync with the backend contract.

## Core invariants (easy to break)

- **ECD types** (must match backend exactly): `date` = `"YYYY-MM-DD"`; `day_of_week` = non-empty array of `"Sun".."Sat"`; `day_of_month` = non-empty array of 1–31; `day_of_year` = `"D/M/YYYY"` (no zero-padding); or `null`. All ECD construction goes through `buildEcdFromInputs` in `src/utils/ecd.ts` — don't build ECD objects ad hoc.
- **Timezone safety**: date strings are parsed manually into components (never `new Date("YYYY-MM-DD")`, which shifts across timezones) — see `TaskCard.resolveEcd`, `EcdCalendar.parseInitial`, `formatDateKey`. Preserve this in any new date code.
- **Done/undone barrier**: undone tasks always sort above done tasks; TaskCard disables moves that would cross the barrier. The backend enforces the ordering — the UI must not offer illegal moves.
- **View modes** (App.tsx state): default, Focus (due today), Past (overdue `date`-type only — recurring is never "past"), Focus+Past = union, By Date (groups by `getEcdDateKey`; done tasks excluded; recurring surfaces under today when due; "No date" section last), Insights, Events.
- **Event scheduling** (EventsPanel): reuses an existing header by case-insensitive name match or creates one; creates tasks **sequentially** to preserve template order. No rollback on mid-stream failure.
- **`headerId` is immutable** on a task; there is no UI to change it.
- **ECD display format** (`TaskCard.resolveEcd`): `date` shows `MM/DD` (adds `/YY` only when not the current year); recurring types show a `↻ ` prefix (`↻ Mon, Wed`, `↻ 1st, 15th` sorted with ordinals, `↻ D/M/YYYY`); no ECD shows "No date". **E2e label helpers (`dateEcdLabel`, `yearlyEcdLabel`) compute these exact strings** — changing the display format breaks e2e assertions.
- **Error conventions**: mutation failures set `actionError`, rendered as "Action failed: {message}"; initial-load failure renders "Failed to load: {error}. Is the backend running at {VITE_API_BASE_URL}?". No retry logic anywhere — follow these patterns rather than adding alerts or toasts.

## Testing

**Unit** (Vitest + jsdom + testing-library; `src/test/setup.ts` adds jest-dom and auto-cleanup):
- `src/api/*.test.ts` mock `apiFetch` via `vi.mock("./client")`; `client.test.ts` stubs global fetch and `VITE_API_BASE_URL` via `vi.stubEnv`.
- `src/utils/ecd.test.ts` uses fake timers pinned to `FAKE_NOW` (June 17, 2026) — keep new date tests on fake timers.
- There are no component unit tests; component coverage is via e2e.

**E2E** (Playwright, `e2e/`): serial (`workers: 1`), hits the **real backend and real DB** on port 3002. `beforeEach` calls `cleanDatabase()`/`cleanEvents()` from `e2e/helpers.ts`, which **delete every header/event via the API** — run the backend against test data (`USE_TEST_DB=true`), never a DB you care about. Helpers provide API-level setup (`createHeader`, `createTask`, `createEvent`), UI-level actions (`addTaskViaUI`, `toggleTaskDone`, ...), and date-label helpers (`dateKey`, `dateEcdLabel`, ...). Only `insights.spec.ts` mocks the network (`page.route` on `/insights*`). Several specs depend on the real system date (viewmodes, calendar navigation) — expect date-boundary flakiness, don't hardcode dates.

Where tests live, by change type:

| If you change...                     | Tests to update                                        |
| ------------------------------------ | ------------------------------------------------------ |
| `src/api/client.ts` or a resource module | matching `src/api/*.test.ts`                       |
| `src/utils/ecd.ts`                   | `src/utils/ecd.test.ts` + `e2e/ecd.spec.ts`            |
| Header UI/flows                      | `e2e/headers.spec.ts`                                  |
| Task UI/flows (create/edit/move/done)| `e2e/tasks.spec.ts` (+ `e2e/integration.spec.ts` for cross-cutting flows) |
| ECD pickers/display                  | `e2e/ecd.spec.ts`                                      |
| Events panel/scheduling              | `e2e/events.spec.ts`                                   |
| Insights panel                       | `e2e/insights.spec.ts`                                 |
| Focus/Past/By-Date modes             | `e2e/viewmodes.spec.ts`                                |
| Multi-step flows, modals, persistence| `e2e/integration.spec.ts`                              |

## Documentation & test policy (MANDATORY)

Any code change MUST include, in the same task: (1) updated/new tests per the table above, passing (`npm test` for unit; e2e for UI changes when a backend is available); (2) updates to **every** affected doc:

| If you change...                  | Update ALL of...                                                        |
| --------------------------------- | ----------------------------------------------------------------------- |
| Features, components, commands    | `README.md` (Features, Project Structure, Setup/Testing sections)       |
| Unit tests (`src/**/*.test.ts`)   | `TEST_REFERENCE.md` — unit-test index ONLY; per-file "Test \| What it checks" tables |
| `e2e/ecd.spec.ts`                 | `ECD_TEST_DOCUMENTATION.md`                                              |
| `e2e/headers.spec.ts`             | `HEADERS_TEST_DOCUMENTATION.md`                                          |
| `e2e/tasks.spec.ts`               | `TASKS_TEST_DOCUMENTATION.md`                                            |
| `e2e/integration.spec.ts`         | `INTEGRATION_TEST_DOCUMENTATION.md`                                      |
| `e2e/events.spec.ts`, `e2e/viewmodes.spec.ts`, `e2e/insights.spec.ts` | **currently undocumented** — when touching one, create its `*_TEST_DOCUMENTATION.md` in the same format as the existing four |
| Anything about the backend API contract | `API_REFERENCE.md` + `todo_app_structure.md` — these mirror the copies in the TaskAtHandBE repo; a backend contract change means updating all four files across both repos |

`*_TEST_DOCUMENTATION.md` format: per-category `### N. Name (X tests)` sections, each test as `#### Test: "name"` with Description/Steps/Expected Output, plus a Summary with the total count. **Keep the per-category counts and the Summary total consistent with the spec file** — they have drifted before.

Note: `API_REFERENCE.md` and `todo_app_structure.md` describe TaskAtHandBE (models, cron, endpoints), kept here for integration reference. They are not frontend docs — don't document FE behavior in them.

Never end a task with code changed but the matching tests and docs untouched. If a change genuinely needs no doc or test update, state why explicitly in your summary.
