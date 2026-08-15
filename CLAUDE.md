# TaskAtHandFE

React 19 + TypeScript + Vite web client for the TaskAtHandBE API. Plain hooks (no state library) — `src/App.tsx` owns all state and orchestrates everything; components communicate via prop callbacks only, no context.

## Commands

- `npm run dev` — Vite on http://localhost:5173
- `npm test` — Vitest unit tests (watch mode; jsdom)
- `npm run test:e2e` — Playwright e2e. **Prerequisite: backend running on port 3002.** Playwright auto-starts the Vite server, but NOT the backend.
- `npm run build` — `tsc -b && vite build` (strict TS; build fails on type errors)
- `npm run lint` — ESLint
- Also available: `test:coverage`, `test:ui` (Vitest UI), `test:list` (Playwright list reporter, 1 worker), `test:e2e:ui`, `test:e2e:report`

Config: `VITE_API_BASE_URL` in `.env` (template in `.env.example`), read at import time in `src/api/client.ts`. Note: the e2e helpers do NOT use it — `e2e/helpers.ts` defaults its own `API_BASE` to `http://localhost:3002` (override with `E2E_API_BASE_URL`), so changing `.env` alone won't repoint e2e setup/cleanup. To run e2e without touching dev servers already on 3002/5173, use env overrides, e.g. `E2E_API_BASE_URL=http://localhost:3012 E2E_WEB_PORT=5273 VITE_API_BASE_URL=http://localhost:3012 npx playwright test` against a `PORT=3012 USE_TEST_DB=true` backend (`E2E_WEB_PORT` makes Playwright start its own Vite on that port instead of reusing an existing one). The `runCron` helper sends `{ skipInsights: true }` to `POST /cron/run`, so an e2e backend started with a real `ANTHROPIC_API_KEY` no longer makes a Claude API call for the daily insight report during tests (that call costs money and used to blow the 30s test timeout) — but the backend must be running code that supports the flag (TaskAtHandBE ≥ the skipInsights change); against an older backend, blank the key in the shell (`ANTHROPIC_API_KEY= node src/server.js`) instead.

## Architecture rules

- **Data flow**: `loadAll()` in App.tsx fetches all headers then each header's tasks; **no optimistic updates** — every mutation calls the API then refetches (`reloadHeaderTasks(headerId)` or full reload). Keep this pattern.
- **API layer** (`src/api/`): everything goes through `apiFetch<T>` in `client.ts` (JSON headers, throws `Error` from `{ error }` body or `!res.ok`). One module per resource (headers, tasks, events, goals, affirmations, insights), re-exported from `index.ts`.
- **Component pattern**: folder-per-component under `src/components/` with `Component.tsx`, `Component.css`, `index.ts` (and optional `Component.types.ts`). Plain CSS, BEM classes (`task-card__ecd--recurring`), CSS variables + dark mode in `src/index.css`.
- **Every add button uses the shared `components/AddButton`** (Shleeji mirrors it with its own `components/AddButton.js`), rendered inside a right-aligned `__toolbar` row at the top of the view. It is **icon-only — a bare "+" with no visible label**, so `ariaLabel` is the only thing naming it: pass it exactly as e2e targets it (`"Add header"`, `"Add goal"`, …), because the accessible name is both the test contract and the button's sole affordance (it is also the `title` tooltip). New views/panels must follow this pattern. Shleeji places the same "+" next to the screen title instead of in a content toolbar row — the two clients deliberately differ here.
- **Modals**: overlay div closes on click (stopPropagation inside), focus via ref on open, `onConfirm(draft)`/`onCancel` callbacks. Match existing modals when adding one.
- **Types** live in `src/types.ts` (Header, Task, EventTemplate, LifeEvent, Insight, the four ECD variants) and are partially mirrored in `src/api/tasks.ts` — keep both in sync with the backend contract.

## Core invariants (easy to break)

- **ECD types** (must match backend exactly): `date` = `"YYYY-MM-DD"`; `day_of_week` = non-empty array of `"Sun".."Sat"`; `day_of_month` = non-empty array of 1–31; `day_of_year` = `"D/M/YYYY"` (no zero-padding); or `null`. All ECD construction goes through `buildEcdFromInputs` in `src/utils/ecd.ts` — don't build ECD objects ad hoc.
- **Timezone safety**: date strings are parsed manually into components (never `new Date("YYYY-MM-DD")`, which shifts across timezones) — see `TaskCard.resolveEcd`, `EcdCalendar.parseInitial`, `formatDateKey`. Preserve this in any new date code.
- **Done/undone barrier**: undone tasks always sort above done tasks; TaskCard disables moves that would cross the barrier. The backend enforces the ordering — the UI must not offer illegal moves.
- **View modes** (App.tsx state): default, By Date (groups by `getEcdDateKey`; done tasks excluded; recurring surfaces under today when due; ordered today → past → future with a thick `.bydate-divider` between the present/past/future sections; "No date" group last), Insights, Events, Life Events, Goals, Projects, Affirmations.
- **Event scheduling** (EventsPanel): reuses an existing header by case-insensitive name match or creates one; creates tasks **sequentially** to preserve template order. No rollback on mid-stream failure.
- **Goal↔todo sync** (`src/utils/goalSync.ts`): a goal step is `under_progress` exactly while its habit task lives under the "One Step At A Time" header. Start creates the task, Pause removes it, and the todo delete flows in App.tsx call `pauseStepsMatchingTask`/`pauseAllStartedSteps` when a task/the header is deleted there — keep any new delete path calling them. **The link is by case-insensitive name, not ID**, so TaskCard receives `goalManaged` for tasks under that header and EditNotesModal locks name + ECD (notes/done stay editable) — keep any new edit path enforcing that lock.
- **A step owns its weekdays** (`GoalStep.days`, server-normalized to a non-empty `"Sun".."Sat"` list in week order): `StepDaysModal` collects them on Start and on the row's days control, and `daysToEcd` mirrors them onto the task's `day_of_week` ECD — the two must always agree, so every path that writes one writes the other. A legacy step stored before the field carries no `days` and means the whole week; read it through `stepDays`, never `step.days` directly. **Because cron step 0 only archives a `habit_result` on days the ECD covers, this list is what the habit's streak is measured over** — narrowing the days is the feature, not a bug in the streak. The `🔥 N` badge on a started row comes from `GET /insights/stats`, matched by task name under that header; a stats failure hides the badge and is never surfaced as an error.
- **Goals mirror the todo's presentation on purpose**: `GoalsPanel` renders step rows with the todo's own `.task-card*` markup and imports `TaskCard/TaskCard.css` directly, and `AddStepModal`/`StepDaysModal` reuse `AddTaskModal.css` and its `add-modal__*` classes (the day picker reuses the add-task dialog's `add-modal__dow*` weekday strip). Changing those todo styles changes the Goals view too — that shared-source coupling is the point, so restyle both together rather than forking a copy. Panel-specific hooks (`goals-panel__step-row`, `goals-panel__step-name`, `goals-panel__step-status`, `goals-panel__step-streak`) stay on the rows for e2e.
- **Goals have no edit mode**: the heading carries move up/down, delete and `+` only — there is deliberately no pencil, so `GoalModal` is create-only and a goal cannot be renamed after creation. Steps are added one at a time via the heading `+`, reordered with the per-step arrows, and removed with the per-step delete; there is no step rename. **Under-progress steps sort above the pending backlog** (`sortSteps` in GoalsPanel — stable, started-first; every step mutation persists that order and all step handlers index into the sorted list) and step moves never cross the started/pending barrier, mirroring the todo's done/undone barrier. **Deleting an `under_progress` step must also delete its "One Step At A Time" task** (`handleDeleteStep` does what Pause does first) or the todo keeps an orphan daily habit no goal points at.
- **Goal order is a server-owned contiguous `priority`** (`0..n-1`), same scheme as headers and projects: `GET /goals` sorts by it, new goals append at the end, a move shifts the neighbours and a delete closes the gap. Goals created before the field existed are backfilled in name order on first read by `Goal.backfillPriorities`, so don't assume every stored goal already has one.
- **Project↔todo sync** (`src/utils/projectSync.ts` + ProjectsPanel): a project task with a `date` is mirrored as a one-time date task in the todo under the project's own header (identified by `Header.projectId`), linked via `todoTaskId`. App.tsx's toggle-done calls `syncProjectTasksForTodoDone`, its edit flow calls `syncProjectTasksForTodoEdit` (name/date/notes mirror; cleared or recurring ECD → project date `null`, link kept; the `Step towards "<project>"` placeholder note mirrors back as empty), its task move flows call `syncProjectTaskOrderForTodo` (linked tasks keep the todo's relative order), and its task/header delete flows call `unlinkProjectTasksForTodoTasks` — keep any new toggle/edit/move/delete path calling them. ProjectsPanel mirrors project-side moves back into todo priorities. **Header order is the backend's job — do not re-add a client-side reorder.** `createTodoTask` gets the header from `POST /headers { name, projectId }` (idempotent per project; adopts a legacy name-matched header), and the server places it in the project block, re-orders on a project move, renames on a project rename and unlinks on a project delete. The backend cron completes linked tasks when it deletes the done todo task. **The server owns the task order inside a project**: dated undone tasks, then undated undone ones, then done ones at the bottom (stable within each group — never sorted by date value). `sameMoveGroup` in ProjectsPanel gates the move arrows on both barriers so the panel can't offer a swap the next write would revert; Shleeji's ProjectsSection mirrors it. **Projects mirror the todo's presentation** the same way Goals do: ProjectsPanel renders task rows with the todo's `.task-card*` markup and imports `TaskCard/TaskCard.css` directly — restyle both together rather than forking a copy. Panel-specific hooks (`projects-panel__task-row`, `__task-name`, `__task-notes`, `__task-date` — the date hook only on dated tasks) stay on the rows for e2e.
- **Life event↔todo sync** (`src/utils/lifeEventSync.ts` + LifeEventsPanel): a life event is an annual "D/M" date the **backend cron** mirrors into the todo once a year as a one-time date task under an "Events" header, linked via `todoTaskId`. App.tsx's toggle-done calls `syncLifeEventsForTodoDone`, its edit flow calls `syncLifeEventsForTodoEdit` (name only — the annual date is deliberately never synced from the todo ECD), and its task/header delete flows call `unlinkLifeEventsForTodoTasks` (link cleared, `done` untouched) — keep any new toggle/edit/delete path calling them. The panel mirrors the other way (its done toggle and rename also update the linked todo task). `lastAddedYear` is server-managed — never write it from the client. The cron completes the loop nightly: deleting the done todo task marks the event done and clears the link; the event itself is never deleted.
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
| Life Events panel/cron sync          | `e2e/lifeevents.spec.ts`                               |
| Goals panel/step lifecycle           | `e2e/goals.spec.ts`                                    |
| Projects panel/todo sync             | `e2e/projects.spec.ts`                                 |
| Affirmations panel/flows             | `e2e/affirmations.spec.ts`                             |
| Insights panel                       | `e2e/insights.spec.ts`                                 |
| By-Date mode                         | `e2e/viewmodes.spec.ts`                                |
| Multi-step flows, modals, persistence| `e2e/integration.spec.ts`                              |

## Documentation & test policy (MANDATORY)

Any code change MUST include, in the same task: (1) updated/new tests per the table above, passing (`npm test` for unit; e2e for UI changes when a backend is available); (2) updates to **every** affected doc:

| If you change...                  | Update ALL of...                                                        |
| --------------------------------- | ----------------------------------------------------------------------- |
| Features, components, commands    | `README.md` (Features, Project Structure, Setup/Testing sections)       |
| Unit tests (`src/**/*.test.ts`)   | `test_doc/TEST_REFERENCE.md` — unit-test index ONLY; per-file "Test \| What it checks" tables |
| `e2e/ecd.spec.ts`                 | `test_doc/ECD_TEST_DOCUMENTATION.md`                                     |
| `e2e/headers.spec.ts`             | `test_doc/HEADERS_TEST_DOCUMENTATION.md`                                 |
| `e2e/tasks.spec.ts`               | `test_doc/TASKS_TEST_DOCUMENTATION.md`                                   |
| `e2e/integration.spec.ts`         | `test_doc/INTEGRATION_TEST_DOCUMENTATION.md`                             |
| `e2e/goals.spec.ts`               | `test_doc/GOALS_TEST_DOCUMENTATION.md`                                   |
| `e2e/projects.spec.ts`            | `test_doc/PROJECTS_TEST_DOCUMENTATION.md`                                |
| `e2e/affirmations.spec.ts`        | `test_doc/AFFIRMATIONS_TEST_DOCUMENTATION.md`                            |
| `e2e/insights.spec.ts`            | `test_doc/INSIGHTS_TEST_DOCUMENTATION.md`                                |
| `e2e/viewmodes.spec.ts`           | `test_doc/VIEWMODES_TEST_DOCUMENTATION.md`                               |
| `e2e/lifeevents.spec.ts`          | `test_doc/LIFEEVENTS_TEST_DOCUMENTATION.md`                              |
| `e2e/events.spec.ts`              | **currently undocumented** — when touching it, create its `*_TEST_DOCUMENTATION.md` in `test_doc/` in the same format as the existing ones |
| Anything about the backend API contract | `API_REFERENCE.md` + `todo_app_structure.md` — these mirror the copies in the TaskAtHandBE repo; a backend contract change means updating all four files across both repos |

**Shleeji parity (MANDATORY):** this web FE and the Shleeji Expo app (`../Shleeji`) are two clients of the same backend and must stay at feature parity. Any user-facing feature or behavior change here (new views/panels, API resources, ECD logic, task flows) MUST be replicated in Shleeji in the same task — FE view modes map to Shleeji bottom tabs (Affirmations view ↔ Affirmations tab, Calls view ↔ Calls tab), and Shleeji's `api/` and `utils/ecd.js` mirror this repo's `src/api/` and `src/utils/ecd.ts`. Purely web-specific changes (CSS polish, e2e/test infra, Vite config) are exempt, but state the exemption explicitly in your summary. See `../Shleeji/CLAUDE.md` for that app's conventions and manual-verification policy.

All test docs live in `test_doc/` — never create test `.md` files at the repo root. `*_TEST_DOCUMENTATION.md` format: per-category `### N. Name (X tests)` sections, each test as `#### Test: "name"` with Description/Steps/Expected Output, plus a Summary with the total count. **Keep the per-category counts and the Summary total consistent with the spec file** — they have drifted before.

Note: `API_REFERENCE.md` and `todo_app_structure.md` describe TaskAtHandBE (models, cron, endpoints), kept here for integration reference. They are not frontend docs — don't document FE behavior in them.

Never end a task with code changed but the matching tests and docs untouched. If a change genuinely needs no doc or test update, state why explicitly in your summary.
