# Frontend Test Reference

This file tracks frontend test scenarios for the new API structure that includes only:

- `headers`
- `tasks`

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
