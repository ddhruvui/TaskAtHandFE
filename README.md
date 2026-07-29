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
- **Adding things** — every view's add action is an icon-only **"+"** button in
  the right-aligned toolbar at the top of that view (hover or a screen reader
  gives the full name, e.g. "Add header", "Add project")
- **View modes** (toolbar toggles):
  - **By Date** — undone tasks grouped by calendar date: today first, then
    past dates, then future dates, with thick dividers between the present,
    past and future sections
  - **Insights** — habit stats and the AI coach (see below)
  - **Events** — manage reusable task bundles (see below)
  - **Life Events** — annual dates the cron adds to the todo (see below)
  - **Goals** — habit backlogs built one step at a time (see below)
  - **Projects** — long term projects built step by step (see below)
  - **Affirmations** — short lines to read daily (see below)
  - **Calls** — people to call biweekly or monthly (see below)

  The panel toggles (everything except By Date) are mutually exclusive:
  clicking one opens that panel and deactivates whichever was open, and
  clicking the active one returns to the todo list. By Date is a todo-list
  filter, stays active while a panel is open, and applies again when the
  panel closes.
- **Events view** — reusable task bundles (e.g. "Burger Night" with its
  shopping list). "Add to todo" opens a date picker plus a checklist of the
  event's tasks (all selected by default, tap to unmark); confirming adds the
  selected tasks, dated for the chosen day, under a header named after the
  event (reused if it already exists, so later additions join it). Each task
  row also has a per-task quick add. Templates are never consumed, so an
  event can be scheduled again and again
- **Life Events view** — dates that repeat every year (e.g. "Wife's birthday"
  on March 7), stored as a day + month with no year. Every year on the day,
  the backend cron adds a one-time task named after the event to the todo
  under an "Events" header (reused case-insensitively, created otherwise) and
  links it. Toggling done on either side flips the other; when the nightly
  cron deletes the completed todo task it marks the event done and keeps it —
  a life event is never deleted by the cron and fires again next year. Rows
  are ordered with move up/down arrows (a contiguous priority like projects)
  and show an "in todo" badge while this year's task is in the todo
- **Goals view** — long-term aims (e.g. "Improve Health") broken into small
  steps/habits ("Wake up at 6", "Have 1 fruit a day"), listed in the order
  you want to build them. Steps render as todo task rows and are added the
  same way: a `+` on the goal heading opens an add-step dialog that appends
  one step, just as `+` on a todo header adds a task. A step is either
  paused (unchecked, `[ Not started ]`) or **under progress** (checked,
  `[ ↻ Daily ]`); the checkbox toggles between them. **Start** puts it under
  progress: a daily recurring task is created under a todo header named
  "One Step At A Time" (reused if it already exists) and kept for life.
  **Pause** takes it out of progress: the daily task is removed and the step
  returns to the backlog. The badge (e.g. "1/4 under progress") rises on
  Start and falls on Pause. Goals are ordered with move up/down arrows on the
  goal heading (a server-side contiguous priority, like headers and
  projects), and each step has its own move up/down and delete — deleting an
  under-progress step removes its daily task too, so the todo never keeps an
  orphan habit. Under-progress steps always sort above the pending backlog
  (starting a step lifts it into the top group) and the move arrows never
  cross that boundary, mirroring the todo's undone-above-done barrier. The two views stay in sync both ways: deleting the daily task
  from the todo — or the whole "One Step At A Time" header — pauses the
  matching step(s) automatically. Because the goal links to its task by name,
  editing a task under "One Step At A Time" locks the name and schedule
  fields (notes and done stay editable) so the link can't drift. A goal's
  name and its initial step list are set when it is created; there is no
  goal-level edit, so steps are managed individually afterwards
- **Projects view** — long term projects (e.g. "Automated Stock Market")
  broken into ordered tasks/steps ("get data from EODHD", "get data from
  Nasdaq", "deploy to cpu"). Projects are ordered with move up/down arrows
  (header-style priority) and each project's tasks are added, edited,
  reordered, completed and deleted with the same interactions as the todo —
  done tasks always drop to the bottom, **dated tasks always sit above the
  undated ones** (a step with a date is already committed to the todo, so it
  outranks the backlog), and moves never cross either barrier. Each task can carry free-text **notes** (shown under
  the task name), just like a todo task. Giving a task a **date** mirrors it
  into the todo as a one-time date task under the project's own header
  (created on demand and kept in the projects' order by the backend), and
  the task's notes are mirrored onto that todo task (an empty note falls back to a
  "Step towards …" default); the badge (e.g. "1/3 done") tracks completion.
  The two views stay in sync both ways: toggling done on
  either side flips the other, editing the todo task's name, date or notes
  updates the project task (clearing the date sets it to none there, and the
  "Step towards …" placeholder note mirrors back as empty), reordering on
  either side mirrors the relative order of linked tasks on the other,
  deleting the todo task (or its header) unlinks the project task (clearing
  its date), removing a task's date removes its todo entry, and renaming
  the project renames its todo header. The project-derived todo headers are
  kept in the projects' priority order — a project ranked above another has
  its todo header above the other's — placed as a contiguous block starting
  just below the topmost existing header (at priority 1), or at the very top
  (priority 0) when the todo has no other headers; moving a project up/down
  re-sorts its todo header to match.
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
│   ├── lifeevents.ts          # /lifeevents CRUD (annual dates, cron-linked)
│   ├── goals.ts               # /goals CRUD (habit backlogs)
│   ├── projects.ts            # /projects CRUD (long term projects)
│   ├── affirmations.ts        # /affirmations CRUD (short daily lines)
│   ├── calls.ts               # /calls CRUD (people to call biweekly/monthly)
│   └── insights.ts            # /insights/stats, /insights/latest, /insights/generate
├── components/
│   ├── TaskCard/  HeaderModal/  AddTaskModal/  ConfirmModal/  EditNotesModal/
│   ├── AddButton/             # Shared icon-only "+" toolbar button (all views)
│   ├── DatePicker/            # EcdCalendar — shared ECD date/recurrence picker
│   ├── InsightsPanel/         # Insights view (stats + AI report)
│   ├── EventsPanel/  EventModal/  ScheduleEventModal/   # Events view
│   ├── LifeEventsPanel/  LifeEventModal/                # Life Events view
│   ├── GoalsPanel/  GoalModal/  AddStepModal/           # Goals view
│   ├── ProjectsPanel/  ProjectModal/  ProjectTaskModal/ # Projects view
│   ├── AffirmationsPanel/  AffirmationModal/            # Affirmations view
│   └── CallsPanel/  CallModal/                          # Calls view
├── utils/ecd.ts               # ECD due-today/date-key helpers
├── utils/goalSync.ts          # goal step ↔ todo sync helpers
├── utils/projectSync.ts       # project task ↔ todo sync helpers
└── utils/lifeEventSync.ts     # life event ↔ todo sync helpers
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
