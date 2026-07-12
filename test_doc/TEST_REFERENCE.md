# Frontend Test Reference

This file tracks frontend unit test scenarios for the API wrappers and shared
utilities (`headers`, `tasks`, `events`, `goals`, `affirmations`, `insights`,
ECD helpers).
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
| remove calls DELETE `/tasks/:id` | Delete request maps to correct endpoint and method |

### `src/api/events.test.ts`

Validates frontend wrapper methods for the Events collection (4 tests):

| Test | What it checks |
| --- | --- |
| getAll calls GET `/events` | Wrapper maps to the correct endpoint and returns the event list |
| create calls POST `/events` with body | `{ name, tasks }` payload is serialized and sent correctly |
| update calls PUT `/events/:id` with partial body | Event update payload is passed as expected |
| remove calls DELETE `/events/:id` | Delete request maps to correct endpoint and method |

### `src/api/goals.test.ts`

Validates frontend wrapper methods for the Goals collection (4 tests):

| Test | What it checks |
| --- | --- |
| getAll calls GET `/goals` | Wrapper maps to the correct endpoint and returns the goal list |
| create calls POST `/goals` with body | `{ name, steps }` payload is serialized and sent correctly |
| update calls PUT `/goals/:id` with partial body | Steps-only update payload is passed as expected |
| remove calls DELETE `/goals/:id` | Delete request maps to correct endpoint and method |

### `src/api/affirmations.test.ts`

Validates frontend wrapper methods for the Affirmations collection (4 tests):

| Test | What it checks |
| --- | --- |
| getAll calls GET `/affirmations` | Wrapper maps to the correct endpoint and returns the affirmation list |
| create calls POST `/affirmations` with body | `{ name }` payload is serialized and sent correctly |
| update calls PUT `/affirmations/:id` with body | `{ name }` update payload is passed as expected |
| remove calls DELETE `/affirmations/:id` | Delete request maps to correct endpoint and method |

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

Validates the ECD utility functions with a fixed fake system time (37 tests):

| Function | Coverage |
| --- | --- |
| `todayDateKey` | local YYYY-MM-DD key; stays on the local calendar day late at night (no UTC rollover) |
| `isTaskDueToday` | null ECD, date match/mismatch, day_of_week in/out, day_of_month in/out, day_of_year match/mismatch |
| `isTaskPast` | null ECD, past/today/future dates, all recurring types return false |
| `getEcdDateKey` | date pass-through, D/M/YYYY → YYYY-MM-DD zero-padding, weekly/monthly due-today vs null, null ECD |
| `formatDateKey` | YYYY-MM-DD → "Fri, Jun 26, 2026" heading format |
| `isValidYearDate` | valid D/M/YYYY, rejected formats, format-only (no range check) |
| `buildEcdFromInputs` | all five modes incl. validation errors (bad date format, empty weekdays, out-of-range month days, bad yearly format) and trimming |

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
