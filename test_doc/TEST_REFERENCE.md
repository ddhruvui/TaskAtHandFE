# Frontend Test Reference

This file tracks frontend unit test scenarios for the API wrappers and shared
utilities (`headers`, `tasks`, `events`, `goals`, `affirmations`, `calls`,
`insights`, ECD helpers, project→todo header order sync).
End-to-end tests are documented in the `*_TEST_DOCUMENTATION.md` files.

---

## Unit Tests (Vitest)

### `src/api/client.test.ts`

Validates the shared HTTP client behavior (`apiFetch`):

| Test | What it checks |
| --- | --- |
| sends request with JSON defaults and returns parsed data | Calls fetch with base URL + path and default JSON headers |
| merges caller-provided headers | Caller headers (e.g. Authorization) are merged with defaults |
| throws server error message when payload contains error field | `{ error: "..." }` from API is surfaced as thrown Error message |
| throws fallback status error when payload has no error field | Non-2xx without error payload throws `API error <status>: <statusText>` |

### `src/api/headers.test.ts`

Validates frontend wrapper methods for the Headers collection:

| Test | What it checks |
| --- | --- |
| getAll calls GET `/headers` | Wrapper maps to the correct endpoint |
| create calls POST `/headers` with body | Body is serialized and sent correctly |
| update calls PUT `/headers/:id` with partial body | Header update payload is passed as expected |
| remove calls DELETE `/headers/:id` | Delete request maps to correct endpoint and method |

### `src/api/tasks.test.ts`

Validates frontend wrapper methods for the Tasks collection:

| Test | What it checks |
| --- | --- |
| getAll calls GET `/tasks?headerId=:id` | Query-string mapping is correct |
| create calls POST `/tasks` with body | Task create payload is serialized and sent correctly |
| update calls PUT `/tasks/:id` with partial body | Task update payload is passed as expected |
| remove calls DELETE `/tasks/:id` without a body when no reason is given | Delete request maps to correct endpoint/method with no body |
| remove sends the reason in the body when deleting an undone task | `remove(id, reason)` serializes `{ reason }` as the DELETE body |

### `src/api/events.test.ts`

Validates frontend wrapper methods for the Events collection (4 tests):

| Test | What it checks |
| --- | --- |
| getAll calls GET `/events` | Wrapper maps to the correct endpoint and returns the event list |
| create calls POST `/events` with body | `{ name, tasks }` payload is serialized and sent correctly |
| update calls PUT `/events/:id` with partial body | Event update payload is passed as expected |
| remove calls DELETE `/events/:id` | Delete request maps to correct endpoint and method |

### `src/api/goals.test.ts`

Validates frontend wrapper methods for the Goals collection (5 tests):

| Test | What it checks |
| --- | --- |
| getAll calls GET `/goals` | Wrapper maps to the correct endpoint and returns the goal list |
| create calls POST `/goals` with body | `{ name, steps }` payload is serialized and sent correctly |
| update calls PUT `/goals/:id` with partial body | Steps-only update payload is passed as expected |
| update sends priority on its own when reordering a goal | A `{ priority }`-only body is serialized and sent, as the goal move arrows do |
| remove calls DELETE `/goals/:id` | Delete request maps to correct endpoint and method |

### `src/api/projects.test.ts`

Validates frontend wrapper methods for the Projects collection (6 tests):

| Test | What it checks |
| --- | --- |
| getAll calls GET `/projects` and returns the project list | Wrapper maps to the correct endpoint and returns the project list |
| create calls POST `/projects` with body | `{ name, tasks }` payload is serialized and sent correctly |
| create serializes task notes in the body | A task's `notes` field is included in the serialized create payload |
| update calls PUT `/projects/:id` with partial body | Tasks-only wholesale update payload is passed as expected |
| update calls PUT `/projects/:id` with a priority move | `{ priority }` reorder payload is passed as expected |
| remove calls DELETE `/projects/:id` | Delete request maps to correct endpoint and method |

### `src/api/affirmations.test.ts`

Validates frontend wrapper methods for the Affirmations collection (4 tests):

| Test | What it checks |
| --- | --- |
| getAll calls GET `/affirmations` | Wrapper maps to the correct endpoint and returns the affirmation list |
| create calls POST `/affirmations` with body | `{ name }` payload is serialized and sent correctly |
| update calls PUT `/affirmations/:id` with body | `{ name }` update payload is passed as expected |
| remove calls DELETE `/affirmations/:id` | Delete request maps to correct endpoint and method |

### `src/api/calls.test.ts`

Validates frontend wrapper methods for the Calls collection (5 tests):

| Test | What it checks |
| --- | --- |
| getAll calls GET `/calls` and returns the call list | Wrapper maps to the correct endpoint and returns the call list |
| create calls POST `/calls` with body | `{ name, frequency }` payload is serialized and sent correctly |
| update calls PUT `/calls/:id` with partial body | Name + frequency update payload is passed as expected |
| update calls PUT `/calls/:id` with a done-only body | `{ done }` toggle payload is passed as expected |
| remove calls DELETE `/calls/:id` | Delete request maps to correct endpoint and method |

### `src/api/insights.test.ts`

Validates frontend wrapper methods for the Insights endpoints (5 tests):

| Test | What it checks |
| --- | --- |
| getStats calls GET `/insights/stats?days=28` by default | Default period is applied |
| getStats passes an explicit days parameter | Query-string mapping is correct |
| getLatest calls GET `/insights/latest` | Wrapper maps to the correct endpoint |
| generate posts `{ days }` when given | POST body includes the period |
| generate posts `{}` when days is omitted | POST body defaults to empty object |

### `src/utils/ecd.test.ts`

Validates the ECD utility functions with a fixed fake system time (36 tests):

| Function | Coverage |
| --- | --- |
| `todayDateKey` | local YYYY-MM-DD key; stays on the local calendar day late at night (no UTC rollover) |
| `isTaskDueToday` | null ECD, date match/mismatch, day_of_week in/out, day_of_month in/out, day_of_year match/mismatch |
| `isPushedLater` | date pushed later (a postpone) → true; earlier/unchanged, null on either side, and non-date types → false |
| `getEcdDateKey` | date pass-through, D/M/YYYY → YYYY-MM-DD zero-padding, weekly/monthly due-today vs null, null ECD |
| `formatDateKey` | YYYY-MM-DD → "Fri, Jun 26, 2026" heading format |
| `isValidYearDate` | valid D/M/YYYY, rejected formats, format-only (no range check) |
| `buildEcdFromInputs` | all five modes incl. validation errors (bad date format, empty weekdays, out-of-range month days, bad yearly format) and trimming |

### `src/utils/projectSync.test.ts`

Validates the project↔todo task-level sync helpers (mocks `projectsApi.getAll` / `projectsApi.update` and asserts the task list each helper writes back). Header **ordering** is no longer tested here — the backend owns it (see `TaskAtHandBE/tests/projects.test.js`):

| Test | What it checks |
| --- | --- |
| mirrors the new done state onto every task linked to the todo task | `syncProjectTasksForTodoDone` flips `done` on tasks matching `todoTaskId`, leaving others alone |
| does not write when no linked task changes state | No `update` call when the project already agrees |
| mirrors a renamed date task onto the project | `syncProjectTasksForTodoEdit` copies name and `date`-type ECD value |
| mirrors edited notes onto the project | `syncProjectTasksForTodoEdit` copies the todo task's notes |
| treats the todo's default placeholder note as empty | `Step towards "<project>"` mirrors back as `""` — no write when the project task has no notes |
| clears the project date for a recurring ECD but keeps the link | Recurring ECD → `date: null`, `todoTaskId` retained |
| clears the project date when the ECD is removed entirely | `ecd: null` → `date: null`, link retained |
| re-arranges linked tasks into the todo's order, leaving unlinked slots alone | `syncProjectTaskOrderForTodo` reorders only linked tasks, in place |
| is a no-op for a single-task order | Early return — no API calls |
| does not write when a project has fewer than two linked tasks | Projects with <2 linked tasks are skipped |
| drops the link and the date for an undone task | `unlinkProjectTasksForTodoTasks` clears `todoTaskId` and `date` |
| keeps the date on a done task for the record | Done tasks keep `date` when unlinked |
| is a no-op for an empty id list | Early return — no API calls |

---

## Notes

- These tests are frontend unit tests and do not replace backend integration tests.
- Cron/backend-only scenarios were intentionally removed from this frontend reference.
- Test setup file: `src/test/setup.ts` (Testing Library + cleanup).

---

## Commands

Run all frontend unit tests:

```bash
npm run test
```

Run coverage:

```bash
npm run test:coverage
```
