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
  - **Events** — manage reusable task bundles (see below)
  - **Goals** — habit backlogs built one step at a time (see below)
- **Events view** — reusable task bundles (e.g. "Burger Night" with its
  shopping list). "Add to todo" opens a date picker plus a checklist of the
  event's tasks (all selected by default, tap to unmark); confirming adds the
  selected tasks, dated for the chosen day, under a header named after the
  event (reused if it already exists, so later additions join it). Each task
  row also has a per-task quick add. Templates are never consumed, so an
  event can be scheduled again and again
- **Goals view** — long-term aims (e.g. "Improve Health") broken into small
  steps/habits ("Wake up at 6", "Have 1 fruit a day"), listed in the order
  you want to build them. A step is either paused (numbered) or **under
  progress** (∞). **Start** puts it under progress: a daily recurring task
  is created under a todo header named "One Step At A Time" (reused if it
  already exists) and kept for life. **Pause** takes it out of progress:
  the daily task is removed and the step returns to the backlog. The badge
  (e.g. "1/4 under progress") rises on Start and falls on Pause. The two
  views stay in sync both ways: deleting the daily task from the todo — or
  the whole "One Step At A Time" header — pauses the matching step(s)
  automatically. Editing a goal edits its name and step list (one step per
  line; steps that keep their name keep their status)
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
│   ├── events.ts              # /events CRUD (reusable task bundles)
│   ├── goals.ts               # /goals CRUD (habit backlogs)
│   └── insights.ts            # /insights/stats, /insights/latest, /insights/generate
├── components/
│   ├── TaskCard/  HeaderModal/  AddTaskModal/  ConfirmModal/  EditNotesModal/
│   ├── DatePicker/            # EcdCalendar — shared ECD date/recurrence picker
│   ├── InsightsPanel/         # Insights view (stats + AI report)
│   ├── EventsPanel/  EventModal/  ScheduleEventModal/   # Events view
│   └── GoalsPanel/  GoalModal/                          # Goals view
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

Playwright end-to-end tests live in `e2e/`; Vitest unit tests live alongside
the API modules in `src/api/*.test.ts`. Both are documented in
`TEST_REFERENCE.md` and the `*_TEST_DOCUMENTATION.md` files.

```bash
# Unit tests (Vitest)
npm run test              # watch mode
npm run test:ui           # Vitest UI
npm run test:coverage     # with coverage

# End-to-end tests (Playwright)
npm run test:e2e          # same as: npx playwright test
npm run test:list         # list reporter, single worker
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:report   # open last HTML report

# Lint
npm run lint
```

## API

Full endpoint documentation: [API_REFERENCE.md](API_REFERENCE.md). Data model
and cron behavior: [todo_app_structure.md](todo_app_structure.md).

Note: the Insights view requires the backend to be deployed with the
`/archive` and `/insights` endpoints and an `ANTHROPIC_API_KEY` configured
(for report generation). Stats and habit cards work without the key; only
"Generate now" needs it.
