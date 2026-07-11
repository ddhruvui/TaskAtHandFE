# TaskAtHand Frontend

React + TypeScript + Vite web app for TaskAtHand. Talks to the TaskAtHandBE
REST API (base URL from `VITE_API_BASE_URL` in `.env`).

## Features

- **Headers & Tasks** — create, rename, reorder, and delete headers; add tasks
  with notes and an optional ECD (one-time date, or recurring by day of week /
  month / year); toggle done, edit, reorder, delete
- **View modes** (toolbar toggles, combinable):
  - **Focus** — only tasks due today
  - **Past** — only overdue one-time tasks
  - **By Date** — undone tasks grouped by calendar date, ascending
  - **Insights** — habit stats and the AI coach (see below)
- **Insights view** — powered by the backend's archive and insights endpoints:
  - Habit cards: completion %, current/best streak, and a hit/miss dot row of
    recent scheduled days (habits = tasks scheduled by day of week)
  - Task stats: one-time tasks completed, average slip past the planned date,
    most-rescheduled tasks (procrastination signal)
  - Coach: the latest AI report (summary, habits on track/slipping, task
    insights, procrastination flags, suggestions) with a "Generate now" button

## Project Structure

```
src/
├── App.tsx                    # Main app: header/task views + mode toggles
├── types.ts                   # Shared types (Task, Header, ECD, Insight*, HabitStat)
├── api/
│   ├── client.ts              # fetch wrapper (VITE_API_BASE_URL)
│   ├── headers.ts / tasks.ts  # CRUD calls
│   └── insights.ts            # /insights/stats, /insights/latest, /insights/generate
├── components/
│   ├── TaskCard/  HeaderModal/  AddTaskModal/  ConfirmModal/  EditNotesModal/
│   └── InsightsPanel/         # Insights view (stats + AI report)
└── utils/ecd.ts               # ECD due-today/past/date-key helpers
```

## Setup & Run

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL (e.g. http://localhost:3002)
npm run dev
```

Build: `npm run build` · Preview: `npm run preview`

## Testing

Playwright end-to-end tests live in `e2e/` and are documented in
`TEST_REFERENCE.md` and the `*_TEST_DOCUMENTATION.md` files.

```bash
npx playwright test
```

## API

Full endpoint documentation: [API_REFERENCE.md](API_REFERENCE.md). Data model
and cron behavior: [todo_app_structure.md](todo_app_structure.md).

Note: the Insights view requires the backend to be deployed with the
`/archive` and `/insights` endpoints and an `ANTHROPIC_API_KEY` configured
(for report generation). Stats and habit cards work without the key; only
"Generate now" needs it.
