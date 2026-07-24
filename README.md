# TaskAtHand Frontend

React + TypeScript + Vite web app for TaskAtHand. Talks to the TaskAtHandBE
REST API (base URL from `VITE_API_BASE_URL` in `.env`).

## Features

- **Headers & Tasks** — create, rename, reorder, and delete headers; add tasks
  with notes and an optional ECD (one-time date, or recurring by day of week /
  month / year); toggle done, edit, reorder, delete. Deleting an **undone**
  task asks for a reason (required) which is archived and fed to the AI coach
  as an abandonment signal; deleting a done task doesn't ask. **Postponing** a
  dated task (editing it to a later date) offers an optional reason field — a
  reason-less postpone is treated as procrastination, a valid reason as a
  legitimate deferral by the AI coach
- **View modes** (toolbar toggles, combinable):
  - **Focus** — only tasks due today
  - **Past** — only overdue one-time tasks
  - **By Date** — undone tasks grouped by calendar date, ascending
  - **Insights** — habit stats and the AI coach (see below)
  - **Events** — manage reusable task bundles (see below)
  - **Goals** — habit backlogs built one step at a time (see below)
  - **Projects** — long term projects built step by step (see below)
  - **Affirmations** — short lines to read daily (see below)
  - **Calls** — people to call biweekly or monthly (see below)
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
- **Projects view** — long term projects (e.g. "Automated Stock Market")
  broken into ordered tasks/steps ("get data from EODHD", "get data from
  Nasdaq", "deploy to cpu"). Projects are ordered with move up/down arrows
  (header-style priority) and each project's tasks are added, edited,
  reordered, completed and deleted with the same interactions as the todo —
  done tasks always drop to the bottom, and moves never cross the
  done/undone barrier. Giving a task a **date** mirrors it into the todo as
  a one-time date task under a header named after the project (reused
  case-insensitively if it already exists); the badge (e.g. "1/3 done")
  tracks completion. The two views stay in sync both ways: toggling done on
  either side flips the other, editing the todo task's name or date updates
  the project task (clearing the date sets it to none there), reordering on
  either side mirrors the relative order of linked tasks on the other,
  deleting the todo task (or its header) unlinks the project task (clearing
  its date), removing a task's date removes its todo entry, and renaming
  the project renames its todo header.
  When the todo task is done and the backend's nightly cron deletes it, the
  project task is marked done and **retained in the project** as a
  completed step (its date is kept for the record)
- **Affirmations view** — a flat list of short lines the user reads daily
  (e.g. "Thank you blessing"), sorted by creation time. Add, edit, and delete
  (with confirmation) — nothing to do with headers or tasks
- **Calls view** — people the user must call **biweekly** (twice a month) or
  **monthly**, split into a Biweekly and a Monthly section. Each person has a
  checkbox to mark them called (strikethrough when done), plus edit (name and
  frequency — changing frequency moves them to the other section) and delete
  (with confirmation). Nothing to do with headers or tasks — call people never
  appear in the task views. The backend cron resets the called state for
  biweekly calls on the 15th and for all calls on the last day of the month
- **Insights view** — powered by the backend's archive and insights endpoints:
  - Habit cards: completion %, current/best streak, and a hit/miss dot row of
    recent scheduled days (habits = tasks scheduled by day of week)
  - Task stats: one-time tasks completed, average slip past the planned date,
    most-rescheduled tasks (procrastination signal)
  - Coach: the latest AI report (summary, habits on track/slipping, task
    insights, procrastination flags, calls to make, suggestions) with a
    "Generate now" button — the "Calls to make" section appears only for
    reports generated after the Calls feature

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
│   ├── projects.ts            # /projects CRUD (long term projects)
│   ├── affirmations.ts        # /affirmations CRUD (short daily lines)
│   ├── calls.ts               # /calls CRUD (people to call biweekly/monthly)
│   └── insights.ts            # /insights/stats, /insights/latest, /insights/generate
├── components/
│   ├── TaskCard/  HeaderModal/  AddTaskModal/  ConfirmModal/  EditNotesModal/
│   ├── DatePicker/            # EcdCalendar — shared ECD date/recurrence picker
│   ├── InsightsPanel/         # Insights view (stats + AI report)
│   ├── EventsPanel/  EventModal/  ScheduleEventModal/   # Events view
│   ├── GoalsPanel/  GoalModal/                          # Goals view
│   ├── ProjectsPanel/  ProjectModal/  ProjectTaskModal/ # Projects view
│   ├── AffirmationsPanel/  AffirmationModal/            # Affirmations view
│   └── CallsPanel/  CallModal/                          # Calls view
├── utils/ecd.ts               # ECD due-today/past/date-key helpers
├── utils/goalSync.ts          # goal step ↔ todo sync helpers
└── utils/projectSync.ts       # project task ↔ todo sync helpers
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
`test_doc/` (`TEST_REFERENCE.md` and the `*_TEST_DOCUMENTATION.md` files).

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
